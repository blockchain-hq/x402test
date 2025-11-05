import { Keypair, PublicKey } from "@solana/web3.js";
import { TestWallets } from "solana-test-wallets";
import { getConnection } from "./connection.js";
import path from "path";
import fs from "fs";

export interface TestWallet {
  keypair: Keypair;
  publicKey: PublicKey;
  tokenAccount: PublicKey;
  usdcMint: PublicKey;
  balance: number;
}

let walletManager: TestWallets | null = null;
let usdcMint: PublicKey | null = null;
let isInitialized = false;

const WALLET_FILE = path.join(process.cwd(), ".x402test-wallets.json");

const initializeWalletManager = async () => {
  if (isInitialized && walletManager) return walletManager;

  // first check if the wallet file exists
  if (fs.existsSync(WALLET_FILE)) {
    try {
      walletManager = await TestWallets.loadFromFile(WALLET_FILE);
      const firstWallet = walletManager.getAll()[0];
      if (firstWallet) {
        const tokenAccountAddress = await firstWallet.getTokenAccountAddress(
          "USDC"
        );
        const connection = getConnection();
        const tokenAccountInfo = await connection.getAccountInfo(
          tokenAccountAddress
        );

        if (tokenAccountInfo) {
          usdcMint = new PublicKey(tokenAccountInfo.data.slice(0, 32));
        }
      }

      isInitialized = true;
      return walletManager;
    } catch (err) {
      console.warn("Error loading wallet file", err);
    }
  }

  walletManager = await TestWallets.create({
    count: 10,
    network: "localnet",
    fundSOL: 10,
    fundTokens: { USDC: 1000 },
    label: "x402test",
  });

  const wallet = walletManager.next();
  const tokenAccountAddress = await wallet.getTokenAccountAddress("USDC");

  const connection = getConnection();
  const tokenAccountInfo = await connection.getAccountInfo(tokenAccountAddress);
  if (tokenAccountInfo) {
    usdcMint = new PublicKey(tokenAccountInfo.data.slice(0, 32));
  }

  await walletManager.saveToFile(WALLET_FILE);

  isInitialized = true;
  return walletManager;
};

export const getWallet = async (): Promise<TestWallet> => {
  await initializeWalletManager();
  if (!walletManager || !usdcMint) {
    throw new Error("Wallet manager not initialized");
  }

  const wallet = walletManager.next();
  const tokenAccountAddress = await wallet.getTokenAccountAddress("USDC");
  if (!usdcMint) {
    throw new Error("USDC mint not found");
  }

  return {
    keypair: wallet.keypair,
    publicKey: wallet.publicKey,
    tokenAccount: tokenAccountAddress,
    usdcMint: usdcMint,
    balance: (await wallet.getTokenBalance("USDC")) || 0,
  };
};

export const getUsdcMint = (): PublicKey => {
  if (!usdcMint) {
    throw new Error("USDC mint not found");
  }
  return usdcMint;
};

export const resetWallets = async () => {
  if (walletManager) {
    walletManager.dispose();
  }
  walletManager = null;
  usdcMint = null;
  isInitialized = false;

  if (fs.existsSync(WALLET_FILE)) {
    fs.unlinkSync(WALLET_FILE);
  }
};
