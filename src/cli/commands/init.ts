import ora from "ora";
import fs from "fs";
import { getWallet } from "../../lib/wallets.js";

interface InitOptions {
  force?: boolean;
}

export const initCommand = async (options: InitOptions) => {
  const configPath = "./x402test.config.js";
  const spinner = ora();
  spinner.start("Initializing x402test configuration...");

  if (fs.existsSync(configPath) && !options.force) {
    spinner.fail("Config file already exists. Use --force to overwrite.");
    process.exit(1);
  }

  spinner.start("Creating test wallet...");
  const wallet = await getWallet();
  spinner.succeed("Test wallet created");

  spinner.start("Creating new x402test config...");
  const config = `
// x402test configuration
export default {
  port: 4402,
  network: 'localnet',
  rpcUrl: 'http://localhost:8899',
  
  recipient: '${wallet.publicKey.toBase58()}',
  
  routes: {
    '/api/premium': {
      price: '0.10',
      description: 'Premium content access',
      response: {
        data: 'This is premium content!',
        timestamp: Date.now()
      }
    },
    
    '/api/data': {
      price: '0.01',
      description: 'Data API access',
      response: (req) => ({
        method: req.method,
        path: req.path,
        data: { message: 'Your data here' }
      })
    }
  }
};
`.trim();

  fs.writeFileSync(configPath, config);

  spinner.succeed(`Config file created at ${configPath}`);
  spinner.info(`Recipient wallet: ${wallet.publicKey.toBase58()}`);
  spinner.info(`USDC balance: ${wallet.balance} USDC`);

  spinner.info(
    "Ready to start your server! Run 'x402test start' to start the server."
  );
};
