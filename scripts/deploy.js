const fs = require('fs');
const path = require('path');
const { ethers, artifacts } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`🧑‍🚀 Desplegando con: ${deployer.address}`);

  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.deploy();
  await assetRegistry.deployed();
  console.log(`📘 AssetRegistry desplegado en: ${assetRegistry.address}`);

  // Creamos una subasta dummy desde AssetRegistry como ejemplo (puedes eliminar si lo haces manual)
  const tx = await assetRegistry.createAsset("Mi NFT", "Subasta NFT", "https://mi.media");
  const receipt = await tx.wait();
  const assetId = receipt.events[0].args.assetId.toString();

  const reservePriceHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(["uint256", "bytes32"], [ethers.utils.parseEther("0.1"), ethers.utils.formatBytes32String("salt")])
  );

  const createTx = await assetRegistry.createAuction(
    assetId,
    Math.floor(Date.now() / 1000) + 60, // startTime = ahora + 1 min
    300, // biddingTime = 5 min
    300, // revealTime = 5 min
    reservePriceHash
  );

  const createReceipt = await createTx.wait();
  const auctionCreated = createReceipt.events.find(e => e.event === "AuctionCreated");
  const auctionAddress = auctionCreated.args.auctionContract;

  console.log(`🏁 BlindAuction creada en: ${auctionAddress}`);

  // Guardar ABIs y direcciones
  const buildDir = path.join(__dirname, '..', 'frontend', 'src', 'utils');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  fs.writeFileSync(`${buildDir}/auctionABI.json`, JSON.stringify(
    await artifacts.readArtifact("BlindAuction").then(a => a.abi),
    null,
    2
  ));
  fs.writeFileSync(`${buildDir}/constants.js`, `export const CONTRACT_ADDRESS = "${auctionAddress}";\n`);

  console.log("✅ ABI y dirección exportadas en frontend.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
