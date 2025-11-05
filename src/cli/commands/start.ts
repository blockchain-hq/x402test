import { startServer } from "../../server/index.js";
import { loadConfig, defaultConfig } from "../../server/config.js";
import { getWallet } from "../../lib/wallets.js";
import type { ServerConfig } from "../../server/config.js";
import ora from "ora";
import chalk from "chalk";

interface StartOptions {
  config?: string;
  port?: string;
}

export const startCommand = async (options: StartOptions) => {
  try {
    const spinner = ora();
    spinner.start("Starting x402test server...");

    let config: ServerConfig;
    try {
      config = loadConfig(options.config || "./x402test.config.js");
      spinner.succeed(
        `Loaded config from ${options.config || "./x402test.config.js"}`
      );
    } catch (err) {
      spinner.warn("No config file found, using default configuration");
      spinner.warn('   Run "x402test init" to create a config file\n');

      const wallet = await getWallet();
      config = {
        ...defaultConfig,
        port: parseInt(options.port || "4402"),
        recipient: wallet.publicKey.toBase58(),
        routes: {
          "/api/test": {
            price: "0.01",
            description: "Test endpoint",
            response: { message: "Test successful!" },
          },
        },
      } as ServerConfig;
    }

    if (options.port) {
      config.port = parseInt(options.port);
    }

    spinner.info("Initializing test environment...");
    await getWallet();

    await startServer(config);
  } catch (err) {
    console.error(
      chalk.red("Failed to start server:"),
      err instanceof Error ? err.message : String(err)
    );
    process.exit(1);
  }
};
