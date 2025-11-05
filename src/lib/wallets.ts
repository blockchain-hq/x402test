import { Keypair, PublicKey } from "@solana/web3.js";
import { TestWallets } from "solana-test-wallets";
import { getConnection } from "./connection.js";

export interface TestWallet {
  keypair: Keypair;
  publicKey: PublicKey;
  tokenAccount: PublicKey;
  usdcMint: PublicKey;
  balance: number;
}

let walletManager: TestWallets | null = null;
let usdcMint: PublicKey | null = null;

const initializeWalletManager = async () => {
  if (walletManager) return walletManager;

  walletManager = await TestWallets.create({
    count: 1,
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

  return walletManager;
};

export const getWallet = async (
  usdcAmount: number = 1000
): Promise<TestWallet> => {
  const manager = await initializeWalletManager();
  const newManager = await TestWallets.create({
    count: 1,
    network: "localnet",
    fundSOL: 10,
    fundTokens: { USDC: usdcAmount },
    label: "x402test",
  });

  const wallet = newManager.next();
  const tokenAccountAddress = await wallet.getTokenAccountAddress("USDC");
  if (!usdcMint) {
    throw new Error("USDC mint not found");
  }

  return {
    keypair: wallet.keypair,
    publicKey: wallet.publicKey,
    tokenAccount: tokenAccountAddress,
    usdcMint: usdcMint,
    balance: usdcAmount,
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
};
