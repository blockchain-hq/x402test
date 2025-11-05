import { Connection } from "@solana/web3.js";

let connection: Connection | null = null;
let currentRpcUrl: string = "http://localhost:8899";

export const getConnection = (rpcUrl?: string): Connection => {
  if (rpcUrl && rpcUrl !== currentRpcUrl) {
    currentRpcUrl = rpcUrl;
    connection = null;
  }

  if (!connection) {
    connection = new Connection(currentRpcUrl, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
    });
  }

  return connection;
};

export const setRpcUrl = (rpcUrl: string) => {
  currentRpcUrl = rpcUrl;
  connection = null;
};

export const getRpcUrl = () => {
  return currentRpcUrl;
};
