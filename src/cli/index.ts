import { Command } from "commander";

const program = new Command();

program
  .name("x402test")
  .description("Testing framework for x402 payment flows on Solana")
  .version("0.1.0");

program
  .command("start")
  .description("Start the x402test server")
  .option("-c, --config <path>", "Config file path", "./x402test.config.js")
  .option("-p, --port <port>", "Server port")
  .action(async () => {}); // TODO: implement start command

program
  .command("init")
  .description("Initialize x402test configuration")
  .option("-f, --force", "Overwrite existing config")
  .action(async () => {}); // TODO: implement init command

program.parse();
