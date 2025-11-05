#!/usr/bin/env node

import { Command } from "commander";
import { startCommand } from "./commands/start.js";
import { initCommand } from "./commands/init.js";

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
  .action(startCommand);

program
  .command("init")
  .description("Initialize x402test configuration")
  .option("-f, --force", "Overwrite existing config")
  .action(initCommand);

program.parse();
