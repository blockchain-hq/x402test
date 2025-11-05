import { NextFunction, Request, Response } from "express";
import { ServerConfig } from "./config.js";
import { PublicKey } from "@solana/web3.js";

export const logRequests = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(`\n ${req.method} ${req.path}`);
  if (req.headers["x-payment"]) {
    console.log("   X-PAYMENT header present");
  }
  next();
};

export const printServerInfo = (config: ServerConfig, recipient: PublicKey) => {
  console.log("\n x402test Mock Server Started");
  console.log(`   Port: ${config.port}`);
  console.log(`   Network: ${config.network || "solana-devnet"}`);
  console.log(`   Recipient: ${recipient.toBase58()}`);
  console.log("\n Configured Routes:");

  for (const [path, routeConfig] of Object.entries(config.routes)) {
    console.log(`   ${path}`);
    console.log(`     Price: ${routeConfig.price} USDC`);
    console.log(`     Description: ${routeConfig.description || "N/A"}`);
  }

  console.log("\n Ready to accept payments!\n");
};

export const toAtomicUnits = (price: string): string => {
  return (parseFloat(price) * 1e6).toString();
};
