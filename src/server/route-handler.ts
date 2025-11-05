import { Connection, PublicKey } from "@solana/web3.js";
import { Request, Response } from "express";
import { RouteConfig, ServerConfig } from "./config";
import { parse402PaymentHeader } from "../lib/parser";
import { PaymentPayload, VerificationResult } from "../shared/schemas";
import { verifyPayment } from "../lib/verify";
import { toAtomicUnits } from "./utils";
import { getUsdcMint } from "../lib/wallets";

export const createRouteHandler = (
  routeConfig: RouteConfig,
  recipient: PublicKey,
  connection: Connection,
  serverConfig: ServerConfig
) => {
  return async (req: Request, res: Response) => {
    const xPaymentHeader = req.headers["x-payment"] as string;

    if (!xPaymentHeader) {
      // TODO: send payment required response
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
      getUsdcMint()
    );

    if (!verification.isValid) {
      console.error("Payment verification failed", verification.invalidReason);
      // TODO: send payment verification failed response
    }

    const verificationResultBuffer = Buffer.from(
      JSON.stringify({
        success: true,
        error: null,
        txHash: verification.txHash,
        networkId: serverConfig.network || "solana-localnet",
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
