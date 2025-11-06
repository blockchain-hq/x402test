#!/usr/bin/env node

import chalk from "chalk";
import { Command } from "commander";
import { startCommand } from "./commands/start.js";
import { initCommand } from "./commands/init.js";
import { routesCommand } from "./commands/routes.js";

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
  .addHelpText(
    "after",
    `
    Examples:
    $ x402test start --port 8080
    $ x402test start --config ./x402test.config.js
  `
  )
  .action((options) => {
    console.log(
      chalk.cyan(`
      --------------------------------------------------
      x402test v${program.version()}
      Testing Solana x402 Payment Flows
      --------------------------------------------------
      `)
    );

    setTimeout(() => {
      startCommand(options);
    }, 800);
  });

program
  .command("init")
  .description("Initialize x402test configuration")
  .option("-f, --force", "Overwrite existing config")
  .action(initCommand);

program
  .command("routes")
  .description("List configured routes")
  .option("-c, --config <path>", "Config file path", "./x402test.config.js")
  .action(routesCommand);

program.parse();
