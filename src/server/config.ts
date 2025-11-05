import { Request } from "express";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

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

export const loadConfig = async (configPath: string): Promise<ServerConfig> => {
  const absPath = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  try {
    const fileUrl = pathToFileURL(absPath).href;
    const moduleUrl = `${fileUrl}?t=${Date.now()}`; // date to bust cache
    const module = await import(moduleUrl);
    const config = module.default || module;
    return config;
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
