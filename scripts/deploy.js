const hre = require("hardhat");

async function main() {
  const BlindAuction = await hre.ethers.getContractFactory("BlindAuction");

  // 60s de puja, 60s de revelación
  const auction = await BlindAuction.deploy(60, 60);
  await auction.deployed();

  console.log(`Contrato desplegado en: ${auction.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
