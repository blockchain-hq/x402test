import { Connection, PublicKey } from "@solana/web3.js";
import { Request, Response } from "express";
import { RouteConfig, ServerConfig } from "./config.js";
import { parse402PaymentHeader } from "../lib/parser.js";
import {
  PaymentPayload,
  PaymentRequiredResponse,
  X402_VERSION,
} from "../shared/schemas.js";
import { verifyPayment } from "../lib/verify.js";
import { toAtomicUnits } from "./utils.js";
import { getUsdcMint } from "../lib/wallets.js";

export const createRouteHandler = (
  routeConfig: RouteConfig,
  recipient: PublicKey,
  connection: Connection,
  serverConfig: ServerConfig
) => {
  return async (req: Request, res: Response) => {
    const xPaymentHeader = req.headers["x-payment"] as string;

    if (!xPaymentHeader) {
      return sendPaymentRequiredResponse(
        req,
        res,
        routeConfig,
        recipient,
        serverConfig
      );
    }

    let payment: PaymentPayload;
    try {
      payment = parse402PaymentHeader(xPaymentHeader);
    } catch (err) {
      console.error("Invalid X-PAYMENT header format", err);
      return res.status(400).json({ error: "Invalid X-PAYMENT header format" });
    }

    const verification = await verifyPayment(
      payment.payload.signature,
      recipient,
      BigInt(toAtomicUnits(routeConfig.price)),
      getUsdcMint(),
      serverConfig.network || "localnet",
      { skipReplayProtection: false }
    );

    if (!verification.isValid) {
      console.error("Payment verification failed", verification.invalidReason);
      return sendPaymentRequiredResponse(
        req,
        res,
        routeConfig,
        recipient,
        serverConfig,
        verification.invalidReason || "Unknown verification error"
      );
    }

    const verificationResultBuffer = Buffer.from(
      JSON.stringify({
        success: true,
        error: null,
        txHash: verification.txHash,
        networkId: serverConfig.network || "localnet",
      })
    ).toString("base64");

    res.setHeader("X-PAYMENT-RESPONSE", verificationResultBuffer);

    const mockData =
      typeof routeConfig.response === "function"
        ? routeConfig.response(req)
        : routeConfig.response;

    res.status(routeConfig.status || 200).json(mockData);
  };
};

export const sendPaymentRequiredResponse = (
  req: Request,
  res: Response,
  routeConfig: RouteConfig,
  recipient: PublicKey,
  config: ServerConfig,
  error?: string
) => {
  const paymentRequiredResponse: PaymentRequiredResponse = {
    x402Version: X402_VERSION,
    accepts: [
      {
        scheme: "solanaTransferChecked",
        network: config.network || "solana-localnet",
        maxAmountRequired: toAtomicUnits(routeConfig.price),
        resource: `http://localhost:${config.port}${req.path}`,
        description: routeConfig.description,
        mimeType: "application/json",
        payTo: recipient.toBase58(),
        asset: getUsdcMint().toBase58(),
        maxTimeoutSeconds: 30,
      },
    ],
    error: error || null,
  };
  res.status(402).json(paymentRequiredResponse);
};
