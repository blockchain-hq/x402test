import express, { Request, Response } from "express";
import { ServerConfig } from "./config.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { logRequests, printServerInfo } from "./utils.js";
import { createRouteHandler } from "./route-handler.js";

export const startServer = async (config: ServerConfig) => {
  const app = express();
  const connection = new Connection(config.rpcUrl || "http://localhost:8899");
  const recipient = new PublicKey(config.recipient);

  app.use(express.json());
  app.use(logRequests);

  // set routes
  for (const [path, routeConfig] of Object.entries(config.routes)) {
    const handler = createRouteHandler(
      routeConfig,
      recipient,
      connection,
      config
    );

    app.get(path, handler);
    app.post(path, handler);
    app.put(path, handler);
    app.delete(path, handler);
  }

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Route not configured in x402test" });
  });

  await new Promise((resolve) => {
    app.listen(config.port, () => {
      printServerInfo(config, recipient);
      resolve(undefined);
    });
  });
};
