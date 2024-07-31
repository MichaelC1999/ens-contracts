import type { DeployFunction } from 'hardhat-deploy/types.js'
import { labelhash, namehash, zeroAddress, zeroHash } from 'viem'
import hre from 'hardhat'
import { getInterfaceId } from '../test/fixtures/createInterfaceId'
import { toLabelId, toTokenId } from '../test/fixtures/utils'
import { dnsEncodeName } from '../test/fixtures/dnsEncodeName'



const func: DeployFunction = async function () {
    const { deployments, network, viem } = hre
    const { run } = deployments
    // const { deployer, owner } = 
    // console.log(deployer.address, userAddress)
    // console.log('ADDR: ', process.env.DEPLOYER_KEY, process.env.OWNER_KEY)

    const registry = await viem.getContractAt("ENSRegistry", "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e")

    console.log(registry.address)

    const userAddress = "0x1CA2b10c61D0d92f2096209385c6cB33E3691b5E"

    const registrarController = await viem.getContractAt("ETHRegistrarController", "0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72")
    const baseRegistrar = await viem.getContractAt("BaseRegistrarImplementation", "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85")
    const ownedResolver = await viem.getContractAt("OwnedResolver", "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD")

    // const publicSubdomainRegistrar = await viem.deployContract('FIFSRegistrar', ["0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e", namehash('publicunwrap.eth')])
    // console.log(publicSubdomainRegistrar.address)

    // const tx = await registrar.write.register([toLabelId('newname'), userAddress, 86400n])

    // await ownedResolver.write.setName([namehash('manzano.eth'), "CUSTOM NAME"])
    // const setTextTx = await ownedResolver.write.setText([namehash('manzano.eth'), "MAIN1", "blah"])

    const nameWrapper = await viem.getContractAt('NameWrapper', "0x0635513f179D50A207757E05759CbD106d7dFcE8")


    // await addWrappedSubdomain(nameWrapper, 'pubic.eth', "a", userAddress, ownedResolver.address)






    // UNWRAP [registrar].eth AND ISSUE SUBDOMAINS
    // let publicSubdomainRegistrar = await viem.getContractAt("FIFSRegistrar", "0xa11691827675483440f5bbd3d0ab479a70e5f705")
    // publicSubdomainRegistrar = await convertNameToSubdomainRegistrar("parentLabel", nameWrapper, viem)
    // await addSubdomain(publicSubdomainRegistrar, userAddress, "b", viem)




    await readOwner(registry, "pubic.eth", "a")
    // await
    //     console.log(await registry.read.owner([namehash('manzano.eth')]),
    //         await ownedResolver.read.name([namehash('manzano.eth')]),
    //         await ownedResolver.read.text([namehash('manzano.eth'), "location"]),
    //         await ownedResolver.read.text([namehash('manzano.eth'), "MAIN1"]),
    //         await baseRegistrar.read.ownerOf([toLabelId('manzano')]),
    //         await registry.read.owner([namehash('pubic.eth')]),
    //         await registry.read.owner([namehash('a.pubic.eth')])
    //     )

}

const convertNameToSubdomainRegistrar = async (parentLabel, nameWrapperContract, viem) => {
    const publicSubdomainRegistrar = await viem.deployContract('FIFSRegistrar', ["0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e", namehash(parentLabel + '.eth')])
    console.log(publicSubdomainRegistrar.address)

    const unwrap = await nameWrapperContract.write.unwrapETH2LD([
        labelhash(parentLabel),
        publicSubdomainRegistrar.address,
        publicSubdomainRegistrar.address
    ], { gas: 1000000n })
    console.log('arrived')
    await viem.waitForTransactionSuccess(unwrap)

    return publicSubdomainRegistrar
}

const addSubdomain = async (publicSubdomainRegistrar, userAddress, label, viem) => {

    const tx = await publicSubdomainRegistrar.write.register([labelhash(label), userAddress], { gas: 1000000n })
    await viem.waitForTransactionSuccess(tx)

}

const addWrappedSubdomain = async (nameWrapperContract, parent, newSubdomain, userAddress, resolverAddress) => {
    await nameWrapperContract.write.setSubnodeRecord(
        [namehash(parent),
            newSubdomain,
            userAddress,
            resolverAddress,
            0n,
            0,
            2021232060n]
    )
}

const readOwner = async (registry, parent, subname) => {
    console.log("parent owner: ", await registry.read.owner([namehash(parent)]))
    if (subname) {
        console.log("subname owner: ", await registry.read.owner([namehash(subname + '.' + parent)]))
    }

}

func()

export default func
