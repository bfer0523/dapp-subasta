import './App.css';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './utils/auctionABI';

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

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const prov = new ethers.providers.Web3Provider(window.ethereum);
        const signer = prov.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const accounts = await prov.send("eth_requestAccounts", []);

        setProvider(prov);
        setSigner(signer);
        setContract(contract);
        setAccount(accounts[0]);
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
    const hash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bool', 'bytes32'],
        [ethers.utils.parseEther(bidValue), fake, ethers.utils.formatBytes32String(nonce)]
      )
    );
    setBlindedBid(hash);
    alert('Hash generado y listo para enviar');
  };

  const handleSendBid = async () => {
    const deposit = ethers.utils.parseEther(bidValue);
    const tx = await contract.placeBid(blindedBid, { value: deposit });
    await tx.wait();
    setHashSent(true);
    alert('¡Puja enviada!');
  };

  const handleReveal = async () => {
    const value = ethers.utils.parseEther(bidValue);
    const tx = await contract.revealBid(value, ethers.utils.formatBytes32String(nonce));
    await tx.wait();
    setRevealed(true);
    alert('¡Puja revelada!');
  };

  const handleEnd = async () => {
    const tx = await contract.endAuction();
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
