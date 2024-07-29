import type { DeployFunction } from 'hardhat-deploy/types.js'
import { labelhash, namehash, zeroAddress, zeroHash } from 'viem'
import hre from 'hardhat'
import { getInterfaceId } from '../test/fixtures/createInterfaceId'
import { toLabelId } from '../test/fixtures/utils'
import { dnsEncodeName } from '../test/fixtures/dnsEncodeName'



const func: DeployFunction = async function () {
  const { deployments, network, viem } = hre
  const { run } = deployments

  const { deployer, owner } = await viem.getNamedClients()
  console.log(deployer.address, owner.address)
  console.log('ADDR: ', process.env.DEPLOYER_KEY, process.env.OWNER_KEY)

  const registry = await viem.deployContract('ENSRegistry', [], {
    artifact: await deployments.getArtifact('ENSRegistry'),
  })

  console.log(registry.address)

  const regOwner = await registry.read.owner([zeroHash])
  switch (regOwner) {
    case deployer.address:
      const hash = await registry.write.setOwner([zeroHash, owner.address], {
        account: deployer.account,
      })
      console.log(
        `Setting final owner of root node on registry (tx:${hash})...`,
      )
      await viem.waitForTransactionSuccess(hash)
      break
    case owner.address:
      break
    default:
      console.log(
        `WARNING: ENS registry root is owned by ${regOwner}; cannot transfer to owner`,
      )
  }




  console.log('deploy root')
  const root = await viem.deployContract('Root', [registry.address])

  console.log('ROOT: ', root.address)


  const setOwnerHash = await registry.write.setOwner([zeroHash, root.address])
  console.log(
    `Setting owner of root node to root contract (tx: ${setOwnerHash})...`,
  )
  await viem.waitForTransactionSuccess(setOwnerHash)

  const rootOwner = await root.read.owner()

  console.log('ROOT OWNER: ', rootOwner)

  switch (rootOwner) {
    case deployer.address:
      const transferOwnershipHash = await root.write.transferOwnership([
        owner.address,
      ])
      console.log(
        `Transferring root ownership to final owner (tx: ${transferOwnershipHash})...`,
      )
      await viem.waitForTransactionSuccess(transferOwnershipHash)
    case owner.address:
      const ownerIsRootController = await root.read.controllers([owner.address])
      if (!ownerIsRootController) {
        const setControllerHash = await root.write.setController(
          [owner.address, true],
          { account: owner.account },
        )
        console.log(
          `Setting final owner as controller on root contract (tx: ${setControllerHash})...`,
        )
        await viem.waitForTransactionSuccess(setControllerHash)
      }
      break
    default:
      console.log(
        `WARNING: Root is owned by ${rootOwner}; cannot transfer to owner account`,
      )
  }

  const registrar = await viem.deployContract('BaseRegistrarImplementation', [
    registry.address,
    namehash('registry'),
  ])

  console.log('Running base registrar setup')

  const transferOwnershipHash = await registrar.write.transferOwnership(
    [owner.address],
    { account: deployer.account },
  )
  console.log(
    `Transferring ownership of registrar to owner (tx: ${transferOwnershipHash})...`,
  )
  await viem.waitForTransactionSuccess(transferOwnershipHash)

  const setSubnodeOwnerHash = await root.write.setSubnodeOwner(
    [labelhash('registry'), registrar.address],
    { account: owner.account },
  )
  console.log(
    `Setting owner of eth node to registrar on root (tx: ${setSubnodeOwnerHash})...`,
  )
  await viem.waitForTransactionSuccess(setSubnodeOwnerHash)

  let oracleAddress: Address = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'

  if (network.name !== 'mainnet') {
    const dummyOracle = await viem.deployContract('DummyOracle', [160000000000n])
    oracleAddress = dummyOracle.address
  }

  const priceOracle = await viem.deployContract('ExponentialPremiumPriceOracle', [
    oracleAddress,
    [0n, 0n, 20294266869609n, 5073566717402n, 158548959919n],
    100000000000000000000000000n,
    21n,
  ])

  const reverseRegistrar = await viem.deployContract('ReverseRegistrar', [
    registry.address,
  ])


  if (owner.address !== deployer.address) {
    const hash = await reverseRegistrar.write.transferOwnership([owner.address])
    console.log(
      `Transferring ownership of ReverseRegistrar to ${owner.address} (tx: ${hash})...`,
    )
    await viem.waitForTransactionSuccess(hash)
  }

  const setReverseOwnerHash = await root.write.setSubnodeOwner(
    [labelhash('reverse'), owner.address],
    { account: owner.account },
  )
  console.log(
    `Setting owner of .reverse to owner on root (tx: ${setReverseOwnerHash})...`,
  )
  await viem.waitForTransactionSuccess(setReverseOwnerHash)

  const setAddrOwnerHash = await registry.write.setSubnodeOwner(
    [namehash('reverse'), labelhash('addr'), reverseRegistrar.address],
    { account: owner.account },
  )
  console.log(
    `Setting owner of .addr.reverse to ReverseRegistrar on registry (tx: ${setAddrOwnerHash})...`,
  )
  await viem.waitForTransactionSuccess(setAddrOwnerHash)

  let metadataHost =
    process.env.METADATA_HOST || 'ens-metadata-service.appspot.com'

  if (network.name === 'localhost') {
    metadataHost = 'http://localhost:8080'
  }

  const metadataUrl = `${metadataHost}/name/0x{id}`

  const metadata = await viem.deployContract('StaticMetadataService', [metadataUrl])



  const nameWrapper = await viem.deployContract('NameWrapper', [
    registry.address,
    registrar.address,
    metadata.address,
  ])

  await nameWrapper.write.setController(["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", true])

  if (owner.address !== deployer.address) {
    const hash = await nameWrapper.write.transferOwnership([owner.address])
    console.log(
      `Transferring ownership of NameWrapper to ${owner.address} (tx: ${hash})...`,
    )
    await viem.waitForTransactionSuccess(hash)
  }

  // Only attempt to make controller etc changes directly on testnets

  await registrar.write.addController([
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  ])

  await registrar.write.addController([
    nameWrapper.address,
  ])

  const interfaceId = await getInterfaceId('INameWrapper')


  const ownedResolver = await viem.deployContract('OwnedResolver', [])
  const setResolverHash = await registrar.write.setResolver(
    [ownedResolver.address],
    { account: owner.account },
  )
  await viem.waitForTransactionSuccess(setResolverHash)

  const resolver = await registry.read.resolver([namehash('registry')])
  console.log(`set resolver for .registry to ${resolver}`)

  const setInterfaceHash = await ownedResolver.write.setInterface([
    namehash('registry'),
    interfaceId,
    nameWrapper.address,
  ])
  console.log(
    `Setting NameWrapper interface ID ${interfaceId} on .eth resolver (tx: ${setInterfaceHash})...`,
  )
  await viem.waitForTransactionSuccess(setInterfaceHash)

  const tx = await registrar.write.register([toLabelId('newname'), "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 86400n])

  await ownedResolver.write.setName([namehash('newname.registry'), "CUSTOM NAME"])
  await ownedResolver.write.setText([namehash('newname.registry'), "MAIN", "MICHAEL MICHAEL MICHAEL MICHAEL MICHAEL MICHAEL MICHAEL MICHAEL MICHAEL MICHAEL "])


  console.log(await registry.read.owner([namehash('newname.registry')]),
    await ownedResolver.read.name([namehash('newname.registry')]),
    await ownedResolver.read.text([namehash('newname.registry'), "MAIN"]),
    // await registry.read.owner([namehash('registry.eth')]),
    await registrar.read.ownerOf([toLabelId('newname')]),
    await nameWrapper.read.owner())

  const expiry = await registrar.read.nameExpires([toLabelId('newname')]);

  // await nameWrapper.write.wrap([
  //   dnsEncodeName('newname.registry'),
  //   "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  //   ownedResolver.address
  // ])

  await nameWrapper.write.registerAndWrapETH2LD(["public",
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    86400n,
    ownedResolver.address,
    0])

  // await nameWrapper.write.wrapETH2LD(
  //   ["newname", // "myname.eth" but only the label
  //     "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // The address you want to own the wrapped name
  //     0, // The owner-controlled fuse bits OR'd together, that you want to burn
  //     ownedResolver.address] // The address of the resolver you want to use]
  // )
  console.log(2)
  await nameWrapper.write.setSubnodeOwner([namehash('public.registry'), "chaser", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 327680, expiry])

  console.log(await registry.read.owner([namehash('chaser.public.registry')]))

}

func()

export default func
