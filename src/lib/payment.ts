import {
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  PaymentPayload,
  paymentPayloadSchema,
  PaymentRequirements,
  X402_VERSION,
} from "../shared/schemas.js";
import { getConnection } from "./connection.js";
import { TestWallet } from "./wallets.js";
import { PaymentCreationError } from "./errors.js";

export const createPayment = async (
  wallet: TestWallet,
  requirements: PaymentRequirements
) => {
  try {
    const connection = getConnection();
    const recipientPubKey = new PublicKey(requirements.payTo);
    const mintPubKey = new PublicKey(requirements.asset);

    const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.keypair,
      mintPubKey,
      wallet.publicKey
    );

    const accountInfo = await getAccount(
      connection,
      senderTokenAccount.address
    );
    const balance = accountInfo?.amount;
    const requiredAmount = BigInt(requirements.maxAmountRequired);

    if (balance < requiredAmount) {
      throw new PaymentCreationError("Insufficient balance");
    }

    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.keypair,
      mintPubKey,
      recipientPubKey
    );
    const amountLamports = BigInt(requirements.maxAmountRequired);
    const transferIx = createTransferCheckedInstruction(
      senderTokenAccount.address,
      mintPubKey,
      recipientTokenAccount.address,
      wallet.publicKey,
      amountLamports,
      6
    );

    const transaction = new Transaction().add(transferIx);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet.keypair],
      { commitment: "confirmed" }
    );
    return signature;
  } catch (err) {
    if (err instanceof Error) {
      throw new PaymentCreationError(err.message, err);
    }
    throw err;
  }
};

export const createXPaymentHeader = (
  signature: string,
  requirements: PaymentRequirements,
  from: string
) => {
  const payload: PaymentPayload = {
    x402Version: X402_VERSION,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: {
      signature: signature,
      from: from,
      amount: requirements.maxAmountRequired,
      mint: requirements.asset,
      timestamp: Date.now(),
    },
  };

  const validated = paymentPayloadSchema.parse(payload);
  const json = JSON.stringify(validated);
  const encoded = Buffer.from(json).toString("base64");

  return encoded;
};
