import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./connection.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export interface VerificationResult {
  isValid: boolean;
  invalidReason: string | null;
  txHash?: string;
  amount?: string;
  from?: string;
  to?: string;
}

export const verifyPayment = async (
  signature: string,
  expectedRecipient: PublicKey,
  expectedAmount: bigint,
  expectedMint: PublicKey
): Promise<VerificationResult> => {
  try {
    const connection = getConnection();
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return {
        isValid: false,
        invalidReason: "Transaction not found",
      };
    }

    if (tx.meta?.err) {
      return {
        isValid: false,
        invalidReason: `Transaction failed: ${JSON.stringify(tx.meta.err)}`,
      };
    }

    const transfer = findTokenTransfer(
      tx.transaction.message.compiledInstructions,
      tx.transaction.message.staticAccountKeys
    );

    if (!transfer.found) {
      return {
        isValid: false,
        invalidReason: "No token transfer instruction found in transaction",
      };
    }

    if (transfer.destination !== expectedRecipient.toBase58()) {
      return {
        isValid: false,
        invalidReason:
          `Wrong recipient: expected ${expectedRecipient.toBase58()}, ` +
          `got ${transfer.destination}`,
      };
    }

    const transferAmount = BigInt(transfer.amount!);
    if (transferAmount < expectedAmount) {
      return {
        isValid: false,
        invalidReason:
          `Insufficient amount: expected ${expectedAmount}, ` +
          `got ${transferAmount}`,
      };
    }

    if (transfer.mint && transfer.mint !== expectedMint.toBase58()) {
      return {
        isValid: false,
        invalidReason:
          `Wrong token: expected ${expectedMint.toBase58()}, ` +
          `got ${transfer.mint}`,
      };
    }

    return {
      isValid: true,
      invalidReason: null,
      txHash: signature,
      amount: transfer.amount,
      from: transfer.source,
      to: transfer.destination,
    };
  } catch (error) {
    return {
      isValid: false,
      invalidReason: `Verification error: ${(error as Error).message}`,
    };
  }
};

const findTokenTransfer = (
  instructions: any[],
  accountKeys: PublicKey[]
): {
  found: boolean;
  amount?: string;
  source?: string;
  destination?: string;
  mint?: string;
} => {
  for (const ix of instructions) {
    const programId = accountKeys[ix.programIdIndex];

    if (!programId.equals(TOKEN_PROGRAM_ID)) continue;

    const instructionType = ix.data[0];

    if (instructionType !== 3 && instructionType !== 12) continue;

    const amount = ix.data.readBigUInt64LE(1).toString();

    const sourceIdx = ix.accountKeyIndexes[0];
    const destIdx = ix.accountKeyIndexes[1];

    const source = accountKeys[sourceIdx].toBase58();
    const destination = accountKeys[destIdx].toBase58();

    let mint: string | undefined;
    if (instructionType === 12 && ix.accountKeyIndexes.length > 2) {
      const mintIdx = ix.accountKeyIndexes[2];
      mint = accountKeys[mintIdx].toBase58();
    }

    return {
      found: true,
      amount,
      source,
      destination,
      mint,
    };
  }

  return { found: false };
};
