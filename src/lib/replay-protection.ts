import path from "path";
import fs from "fs";
import chalk from "chalk";

interface SignatureRecord {
  signature: string;
  usedAt: number;
  endpoint: string;
  amount: string;
}

const SIGNATURE_FILE = path.join(process.cwd(), ".x402test-signatures.json");
const usedSignatures = new Map<string, SignatureRecord>();

let isInitialized = false;

export const loadSignatures = (): void => {
  if (isInitialized) return;

  try {
    if (fs.existsSync(SIGNATURE_FILE)) {
      const content = fs.readFileSync(SIGNATURE_FILE, "utf8");
      const data = JSON.parse(content);

      if (Array.isArray(data)) {
        data.forEach((record: SignatureRecord) => {
          usedSignatures.set(record.signature, record);
        });
      }

      // console.debug(
      //   chalk.gray(
      //     `Loaded ${usedSignatures.size} used signatures from ${SIGNATURE_FILE}`
      //   )
      // );
    }
  } catch (error) {
    console.error(
      chalk.red(`Error loading signatures from ${SIGNATURE_FILE}:`),
      error
    );
  }

  isInitialized = true;
};

export const saveSignatures = () => {
  try {
    const data = Array.from(usedSignatures.values());
    fs.writeFileSync(SIGNATURE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(
      chalk.red(`Error saving signatures to ${SIGNATURE_FILE}:`),
      error
    );
  }
};

export const isSignatureUsed = (signature: string): boolean => {
  loadSignatures();
  return usedSignatures.has(signature);
};

export const markSignatureUsed = (
  signature: string,
  endpoint: string = "unknown",
  amount: string = "0"
): void => {
  loadSignatures();

  const record: SignatureRecord = {
    signature,
    usedAt: Date.now(),
    endpoint,
    amount,
  };

  usedSignatures.set(signature, record);
  saveSignatures();

  // console.debug(
  //   chalk.gray(
  //     `Marked signature used: ${signature} for ${endpoint} with amount ${amount}`
  //   )
  // );
};

export const getSignatureInfo = (
  signature: string
): SignatureRecord | undefined => {
  loadSignatures();
  return usedSignatures.get(signature);
};

export const resetSignatures = () => {
  usedSignatures.clear();

  if (fs.existsSync(SIGNATURE_FILE)) {
    fs.unlinkSync(SIGNATURE_FILE);
  }

  // console.debug(chalk.gray("All signatures cleared"));
};

export const getSignatureStats = () => {
  loadSignatures();

  return {
    total: usedSignatures.size,
    signatures: Array.from(usedSignatures.values()),
  };
};
