const fs = require("fs");
const path = require("path");
const { ethers, artifacts } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`🧑‍🚀 Desplegando con: ${deployer.address}`);

  // Desplegar contrato AssetRegistry
  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.deploy();
  await assetRegistry.waitForDeployment(); // ✅ Compatible con Ethers v6

  const assetAddress = await assetRegistry.getAddress();
  console.log("✅ AssetRegistry desplegado en:", assetAddress);

  // Crear un Asset de prueba
  const tx = await assetRegistry.createAsset("Mi NFT", "Subasta NFT", "https://mi.media");
  const receipt = await tx.wait();

  //console.log("Eventos en receipt:", receipt.events); // 👀 Verificación para depuración
  //console.log("Logs en receipt:", receipt.logs); // 👀 Depuración adicional

  const assetCreatedLog = receipt.logs.find(log => 
    log.topics[0] === ethers.id("AssetCreated(uint256,address,string)")
  );
  if (assetCreatedLog) {
    const assetId = ethers.getBigInt(assetCreatedLog.topics[1]).toString(); 
    console.log(`🖼️ Asset creado con ID: ${assetId}`);

    // Generar el hash del precio de reserva
    const reservePriceHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bytes32"],
        [ethers.parseEther("0.1"),ethers.solidityPackedKeccak256(["bytes32"], [ethers.encodeBytes32String("salt")
        ])
        ]
      )
    );
    

    // Crear subasta desde AssetRegistry
    const createTx = await assetRegistry.createAuction(
      assetId,
      Math.floor(Date.now() / 1000) + 60, // startTime = ahora + 1 min
      300, // biddingTime = 5 min
      300, // revealTime = 5 min
      reservePriceHash
    );

    const createReceipt = await createTx.wait();
    //console.log("Todos los logs recibidos:", createReceipt.logs);
    const auctionCreatedLog = createReceipt.logs.find(log =>
      log.topics[0] === ethers.id("AuctionCreated(address,uint256,uint256,uint256,uint256)")
    );    
    
    if (auctionCreatedLog) {
      const auctionAddress = "0x" + auctionCreatedLog.topics[1].slice(-40);
      console.log(`🏁 BlindAuction creada en: ${auctionAddress}`);

      // Guardar ABIs y direcciones
      const buildDir = path.join(__dirname, "..", "src", "utils");
      if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

      fs.writeFileSync(
        `${buildDir}/auctionABI.json`,
        JSON.stringify(await artifacts.readArtifact("BlindAuction").then((a) => a.abi), null, 2)
      );
      const constantsPath = `${buildDir}/constants.js`;

      // Leer contenido actual de constants.js si existe
      let constantsContent = "";
      if (fs.existsSync(constantsPath)) {
        constantsContent = fs.readFileSync(constantsPath, "utf-8");
      }
      
      // Crear un objeto con las direcciones y actualizarlo si ya hay datos previos
      const constantsObject = {
        ASSET_REGISTRY_ADDRESS: assetAddress,
        CONTRACT_ADDRESS: auctionAddress
      };
      
      // Si había contenido previo, preservar otras constantes sin eliminar datos existentes
      if (constantsContent) {
        try {
          const existingConstants = eval(constantsContent.replace(/export const /g, "").replace(/;/g, ","));
          Object.assign(constantsObject, existingConstants);
        } catch (error) {
          console.error("⚠️ Error al leer constants.js, se sobrescribirá con nuevos valores.");
        }
      }
      
      // Escribir el contenido actualizado en constants.js
      const newConstantsText = Object.entries(constantsObject)
        .map(([key, value]) => `export const ${key} = "${value}";`)
        .join("\n");
      
      fs.writeFileSync(constantsPath, newConstantsText);
      console.log("✅ ABI y dirección exportadas en frontend.");
    } else {
      console.error("⚠️ No se encontró el evento AuctionCreated. Verifica que el contrato emite correctamente el evento.");
    }
  } else {
    console.error("⚠️ No se encontraron eventos en la transacción de creación de asset. Revisa el contrato.");
    console.log("Logs en receipt:", receipt.logs);
  }
}

main().catch((error) => {
  console.error("❌ Error en el despliegue:", error);
  process.exitCode = 1;
});
