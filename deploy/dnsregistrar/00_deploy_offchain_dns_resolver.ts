import type { DeployFunction } from 'hardhat-deploy/types.js'

const func: DeployFunction = async function (hre) {
  const { viem } = hre

  const registry = await viem.getContract('ENSRegistry')
  const dnssec = await viem.getContract('DNSSECImpl')

  const dns = await viem.getContractAt('DNSRegistrar', "0xB32cB5677a7C971689228EC835800432B339bA2B")

  await viem.deploy('OffchainDNSResolver', [
    registry.address,
    dnssec.address,
    'https://dnssec-oracle.ens.domains/',
  ])
}

func.tags = ['OffchainDNSResolver']
func.dependencies = ['registry', 'dnssec-oracle']

export default func
