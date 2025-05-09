import './App.css';
import React, { useEffect, useState } from 'react';
import { ethers } from "ethers";

import {
  BrowserProvider,
  Contract,
  keccak256,
  parseEther,
  encodeBytes32String,
  AbiCoder
} from 'ethers';
import { CONTRACT_ADDRESS } from './utils/constants';
import contractABI from './utils/auctionABI.json';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [bidValue, setBidValue] = useState('');
  const [fake, setFake] = useState(false);
  const [nonce, setNonce] = useState('');
  const [blindedBid, setBlindedBid] = useState(null);
  const [hashSent, setHashSent] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const abiCoder = new AbiCoder();

  useEffect(() => {
    const init = async () => {
      try {
        if (!window.ethereum) {
          alert('MetaMask no está instalada');
          return;
        }

        const prov = new BrowserProvider(window.ethereum);
        const signer = await prov.getSigner();
        const address = await signer.getAddress();
        const contract = new Contract(CONTRACT_ADDRESS, contractABI, signer);

        setProvider(prov);
        setSigner(signer);
        setContract(contract);
        setAccount(address);
      } catch (error) {
        console.error('Error al conectar MetaMask:', error);
        alert('Hubo un problema al conectar con MetaMask.');
      }
    };

    init();
  }, []);
  
  const handleCreateHash = () => {
    if (!nonce || !bidValue) {
      alert('Introduce un nonce y valor de puja');
      return;
    }

    const hash = keccak256(
      abiCoder.encode(
        ['uint256', 'bool', 'bytes32'],
        [parseEther(bidValue), fake, encodeBytes32String(nonce)]
      )
    );

    setBlindedBid(hash);
    alert('✅ Hash generado y listo para enviar');
  };

  const sendTransaction = async (method, ...args) => {
    try {
      if (!contract) {
        alert('Contrato no conectado');
        return;
      }

      const tx = await contract[method](...args);
      await tx.wait();
      alert(`✅ Transacción "${method}" completada`);
    } catch (error) {
      console.error(`Error en "${method}":`, error);
      alert(`⚠️ Error en la transacción: ${error.message}`);
    }
  };

  const handleSendBid = async () => {
    const deposit = parseEther(bidValue);
    await sendTransaction('bid', blindedBid, { value: deposit });
    setHashSent(true);
  };

  const handleReveal = async () => {
    try {
      const value = parseEther(bidValue); // Convertir ETH a wei
      const valuesArray = [value]; // Array de BigInt
      const fakesArray = [fake ? ethers.encodeBytes32String("true") : ethers.encodeBytes32String("false")]; // ✅ Convertir booleano a bytes32  
      const tx = await contract.reveal(valuesArray, fakesArray);
      await tx.wait();
      setRevealed(true);
      alert("✅ Puja revelada correctamente.");
    } catch (error) {
      console.error(error);
      alert("⚠️ Error al revelar: " + error.message);
    }
  };

  const handleEnd = async () => await sendTransaction("endAuction");
  const handleWithdraw = async () => await sendTransaction('withdraw');

  return (
  <div className="p-6 max-w-3xl mx-auto bg-white rounded-lg shadow-lg">
    <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">🔐 Subasta Blindada con Ethers</h1>

    <p className="text-lg font-semibold">
      <span className="font-bold">Conectado como:</span> {account || 'No conectado'}
    </p>

    <hr className="my-4 border-t-2 border-gray-300" />
    
    <div className="mb-6">
      <h3 className="text-2xl font-semibold text-blue-500 mb-2">1. Crear Puja</h3>
      
      <input
        type="text"
        placeholder="Valor en ETH"
        value={bidValue}
        onChange={(e) => setBidValue(e.target.value)}
        className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <input
        type="text"
        placeholder="Nonce secreto"
        value={nonce}
        onChange={(e) => setNonce(e.target.value)}
        className="w-full p-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <label className="inline-flex items-center space-x-2 text-gray-700 mb-4">
        <input
          type="checkbox"
          checked={fake}
          onChange={() => setFake(!fake)}
          className="h-5 w-5"
        />
        <span className="text-sm">Puja falsa</span>
      </label>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={handleCreateHash}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition"
        >
          Generar hash
        </button>
        
        <button
          onClick={handleSendBid}
          disabled={!blindedBid}
          className={`px-6 py-3 font-semibold rounded-md transition ${
            blindedBid ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-400 text-gray-700 cursor-not-allowed'
          }`}
        >
          Enviar puja
        </button>
      </div>

      <hr className="my-4 border-t-2 border-gray-300" />
    </div>

    <div className="mb-6">
      <h3 className="text-2xl font-semibold text-blue-500 mb-2">2. Revelar Puja</h3>
      <button
        onClick={handleReveal}
        disabled={!hashSent}
        className={`px-6 py-3 font-semibold rounded-md transition ${
          hashSent ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-400 text-gray-700 cursor-not-allowed'
        }`}
      >
        Revelar
      </button>
    </div>

    <hr className="my-4 border-t-2 border-gray-300" />

    <div className="mb-6">
      <h3 className="text-2xl font-semibold text-blue-500 mb-2">3. Finalizar Subasta</h3>
      <button
        onClick={handleEnd}
        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition"
      >
        Finalizar
      </button>
    </div>

    <hr className="my-4 border-t-2 border-gray-300" />

    <div className="mb-6">
      <h3 className="text-2xl font-semibold text-blue-500 mb-2">4. Retirar Reembolso</h3>
      <button
        onClick={handleWithdraw}
        className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition"
      >
        Retirar
      </button>
    </div>
  </div>
);

}

export default App;
