import {
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import {
  PaymentPayload,
  paymentPayloadSchema,
  PaymentRequirements,
  X402_VERSION,
} from "../shared/schemas";
import { getConnection } from "./connection";
import { TestWallet } from "./wallets";
import { PaymentCreationError } from "./errors";

export const createPayment = async (
  wallet: TestWallet,
  requirements: PaymentRequirements
) => {
  try {
    const connection = getConnection();
    const recipientPubKey = new PublicKey(requirements.payTo);
    const mintPubKey = new PublicKey(requirements.asset);

    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.keypair,
      mintPubKey,
      recipientPubKey
    );
    const amountLamports = BigInt(requirements.maxAmountRequired);
    const transferIx = createTransferCheckedInstruction(
      wallet.tokenAccount,
      mintPubKey,
      recipientTokenAccount.address,
      wallet.publicKey,
      amountLamports,
      6
    );

    const transaction = new Transaction().add(transferIx);
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      wallet.keypair,
    ]);
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
