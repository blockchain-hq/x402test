import chalk from "chalk";

export type Explorer = "solana-explorer" | "solscan";
export type Cluster = "devnet" | "mainnet-beta" | "localnet";

export const getExplorerUrl = (
  txSignature: string,
  explorer: Explorer,
  cluster: Cluster
): string => {
  const clusterParam = getClusterParam(cluster);

  switch (explorer) {
    case "solana-explorer":
      return `https://explorer.solana.com/tx/${txSignature}${clusterParam}`;

    case "solscan":
      return `https://solscan.io/tx/${txSignature}${clusterParam}`;

    default:
      throw new Error(`Invalid explorer: ${explorer}`);
  }
};

const getClusterParam = (cluster: Cluster) => {
  switch (cluster) {
    case "mainnet-beta":
      return "";

    case "devnet":
      return "?cluster=devnet";

    case "localnet":
      return "?cluster=custom&customUrl=http://localhost:8899";

    default:
      throw new Error(`Invalid cluster: ${cluster}`);
  }
};

export const logExplorerLink = (
  txSignature: string,
  explorer: Explorer,
  cluster: Cluster
) => {
  const explorerUrl = getExplorerUrl(txSignature, explorer, cluster);

  console.log(chalk.cyan(`signature: ${txSignature}`));
  console.log(chalk.blue(`Explorer link: ${explorerUrl}`));
  console.log("\n");
};
