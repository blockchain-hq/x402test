import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./connection.js";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { isSignatureUsed, markSignatureUsed } from "./replay-protection.js";
import { Cluster, logExplorerLink } from "./explorers.js";

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
  expectedMint: PublicKey,
  cluster: Cluster,
  { skipReplayProtection = true }: { skipReplayProtection?: boolean } = {}
): Promise<VerificationResult> => {
  try {
    const connection = getConnection();

    // check for replay attack
    if (!skipReplayProtection && isSignatureUsed(signature)) {
      console.log("Replay attack detected");

      return {
        isValid: false,
        invalidReason: "Payment already processed",
      };
    }

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

    const transfer = await findTokenTransfer(
      tx.transaction.message.compiledInstructions,
      tx.transaction.message.staticAccountKeys
    );

    if (!transfer.found) {
      return {
        isValid: false,
        invalidReason: "No token transfer instruction found in transaction",
      };
    }

    if (!transfer.destinationOwner) {
      return {
        isValid: false,
        invalidReason: "Destination owner not found",
      };
    }

    if (transfer.destinationOwner !== expectedRecipient.toBase58()) {
      return {
        isValid: false,
        invalidReason:
          `Wrong recipient: expected ${expectedRecipient.toBase58()}, ` +
          `got ${transfer.destinationOwner}`,
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

    markSignatureUsed(signature, "payment-verification", transfer.amount);

    logExplorerLink(signature, "solana-explorer", cluster);

    return {
      isValid: true,
      invalidReason: null,
      txHash: signature,
      amount: transfer.amount,
      from: transfer.sourceOwner,
      to: transfer.destinationOwner,
    };
  } catch (error) {
    return {
      isValid: false,
      invalidReason: `Verification error: ${(error as Error).message}`,
    };
  }
};

const findTokenTransfer = async (
  instructions: any[],
  accountKeys: PublicKey[]
): Promise<{
  found: boolean;
  amount?: string;
  source?: string;
  destination?: string;
  sourceOwner?: string;
  destinationOwner?: string;
  mint?: string;
}> => {
  for (const ix of instructions) {
    const programId = accountKeys[ix.programIdIndex];

    if (!programId.equals(TOKEN_PROGRAM_ID)) continue;

    const instructionType = ix.data[0];

    if (instructionType !== 3 && instructionType !== 12) continue;

    console.log(`   Found token transfer (type ${instructionType})`);
    console.log(`   Account indices:`, ix.accountKeyIndexes);

    const amount = ix.data.readBigUInt64LE(1).toString();

    let sourceIdx: number;
    let destIdx: number;
    let mintIdx: number | undefined;

    if (instructionType === 3) {
      // transfer -> [source, destination, owner]
      sourceIdx = ix.accountKeyIndexes[0];
      destIdx = ix.accountKeyIndexes[1];
    } else {
      sourceIdx = ix.accountKeyIndexes[0];
      mintIdx = ix.accountKeyIndexes[1];
      destIdx = ix.accountKeyIndexes[2];
    }

    const source = accountKeys[sourceIdx];
    const destination = accountKeys[destIdx];
    const mint =
      mintIdx != undefined ? accountKeys[mintIdx].toBase58() : undefined;

    console.log(`   Source token account: ${source.toBase58()}`);
    console.log(`   Dest token account: ${destination.toBase58()}`);
    console.log(`   Mint: ${mint}`);

    let sourceOwner: string | undefined;
    let destinationOwner: string | undefined;
    const connection = getConnection();

    try {
      const sourceAccount = await getAccount(connection, source);
      sourceOwner = sourceAccount.owner.toBase58();
      console.log(`   Source owner: ${sourceOwner}`);
    } catch (err) {
      console.warn("Could not fetch source token account");
    }

    try {
      const destAccount = await getAccount(connection, destination);
      destinationOwner = destAccount.owner.toBase58();
      console.log(`   Destination owner: ${destinationOwner}`);
    } catch (err) {
      console.warn("Could not fetch destination token account");
    }

    return {
      found: true,
      amount,
      source: source.toBase58(),
      destination: destination.toBase58(),
      sourceOwner,
      destinationOwner,
      mint,
    };
  }

  return { found: false };
};
