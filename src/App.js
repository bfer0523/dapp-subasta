import './App.css';
import React, { useEffect, useState } from 'react';
import {
  BrowserProvider,
  Contract,
  keccak256,
  parseEther,
  encodeBytes32String,
  AbiCoder
} from 'ethers';
import { contractAddress, contractABI } from './utils/auctionABI';

function App() {
  const [provider, setProvider] = useState();
  const [signer, setSigner] = useState();
  const [contract, setContract] = useState();
  const [account, setAccount] = useState();

  const [bidValue, setBidValue] = useState('');
  const [fake, setFake] = useState(false);
  const [nonce, setNonce] = useState('');
  const [blindedBid, setBlindedBid] = useState();
  const [hashSent, setHashSent] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const abiCoder = new AbiCoder(); // CORRECCIÓN: crear instancia de AbiCoder

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const prov = new BrowserProvider(window.ethereum);
        const signer = await prov.getSigner();
        const address = await signer.getAddress();
        const contract = new Contract(contractAddress, contractABI, signer);

        setProvider(prov);
        setSigner(signer);
        setContract(contract);
        setAccount(address);
      } else {
        alert('MetaMask no está instalada');
      }
    };

    init();
  }, []);

  const handleCreateHash = () => {
    if (!nonce) {
      alert('Introduce un nonce (secreto)');
      return;
    }
    const hash = keccak256(
      abiCoder.encode(
        ['uint256', 'bool', 'bytes32'],
        [parseEther(bidValue), fake, encodeBytes32String(nonce)] // CORRECCIÓN: encodeBytes32String en vez de formatBytes32String
      )
    );
    setBlindedBid(hash);
    alert('Hash generado y listo para enviar');
  };

  const handleSendBid = async () => {
    const deposit = parseEther(bidValue);
    const tx = await contract.bid(blindedBid, { value: deposit });
    await tx.wait();
    setHashSent(true);
    alert('¡Puja enviada!');
  };

  const handleReveal = async () => {
    try {
      const value = parseEther(bidValue); // convierte ETH a wei (BigInt)
      const valuesArray = [value]; // Un array de BigInt (no convertir a string)
      const fakesArray = [fake]; // Un array de booleanos
  
      const tx = await contract.reveal(valuesArray, fakesArray);
      await tx.wait();
      setRevealed(true);
      alert('¡Puja revelada!');
    } catch (error) {
      console.error(error);
      alert('Error al revelar: ' + error.message);
    }
  };

  const handleEnd = async () => {
    const tx = await contract.auctionEnd();
    await tx.wait();
    alert('Subasta finalizada');
  };

  const handleWithdraw = async () => {
    const tx = await contract.withdraw();
    await tx.wait();
    alert('Reembolso retirado');
  };

  return (
    <div style={{ padding: 30 }}>
      <h1>🔐 Subasta Blindada con Ethers</h1>
      <p><strong>Conectado como:</strong> {account}</p>

      <hr />
      <h3>1. Crear Puja</h3>
      <input
        type="text"
        placeholder="Valor en ETH"
        value={bidValue}
        onChange={(e) => setBidValue(e.target.value)}
      />
      <input
        type="text"
        placeholder="Nonce secreto"
        value={nonce}
        onChange={(e) => setNonce(e.target.value)}
      />
      <label>
        <input type="checkbox" checked={fake} onChange={() => setFake(!fake)} />
        Puja falsa
      </label>
      <br />
      <button onClick={handleCreateHash}>Generar hash</button>
      <button onClick={handleSendBid} disabled={!blindedBid}>Enviar puja</button>

      <hr />
      <h3>2. Revelar Puja</h3>
      <button onClick={handleReveal} disabled={!hashSent}>Revelar</button>

      <hr />
      <h3>3. Finalizar Subasta</h3>
      <button onClick={handleEnd}>Finalizar</button>

      <hr />
      <h3>4. Retirar Reembolso</h3>
      <button onClick={handleWithdraw}>Retirar</button>
    </div>
  );
}

export default App;
