"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import React from "react";

export function WalletConnector() {
  const { connect, disconnect, account, wallets, connected, isLoading, wallet } =
    useWallet();

  const handleConnect = (walletName: string) => {
    connect(walletName);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6 text-center">
      {!connected && !isLoading && (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
          {wallets.map((w) => (
            <button
              key={w.name}
              onClick={() => handleConnect(w.name)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors w-full sm:w-auto"
              disabled={isLoading}
            >
              Connect {w.name}
            </button>
          ))}
        </div>
      )}
      {isLoading && <p>Connecting...</p>}
      {connected && account && (
        <div className="flex flex-col items-center gap-2">
           <p className="text-sm font-mono break-all">
             Connected: {account.address.substring(0, 6)}...{account.address.substring(account.address.length - 4)} ({wallet?.name})
           </p>
           <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
           >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
} 