import { Request } from "express";
import path from "path";
import fs from "fs";

export interface RouteConfig {
  price: string;
  description?: string;
  status?: number;
  response: any | ((req: Request) => any);
}

export interface ServerConfig {
  port: number;
  recipient: string;
  network?: string;
  rpcUrl?: string;
  routes: Record<string, RouteConfig>;
}

export const loadConfig = (configPath: string): ServerConfig => {
  const absPath = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  try {
    delete require.cache[require.resolve(absPath)]; // clear cache

    const config = require(absPath);
    return config.default || config;
  } catch (err) {
    throw new Error(
      `Failed to load config: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
};

export const defaultConfig: Partial<ServerConfig> = {
  port: 4402,
  network: "solana-localnet",
  rpcUrl: "http://localhost:8899",
};
