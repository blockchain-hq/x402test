import { ZodError } from "zod";
import {
  paymentPayloadSchema,
  paymentRequiredResponseSchema,
  PaymentRequirements,
  PaymentPayload,
  X402_VERSION,
} from "../shared/schemas";
import { X402ParseError } from "./errors";

export const parse402Response = (body: unknown): PaymentRequirements => {
  try {
    const response = paymentRequiredResponseSchema.parse(body);
    if (response.x402Version !== X402_VERSION) {
      console.warn(
        `Server uses x402 v${response.x402Version}, we support v${X402_VERSION}`
      );
    }

    if (response.error) {
      throw new X402ParseError(`Server returned error: ${response.error}`);
    }

    if (response.accepts.length === 0) {
      throw new X402ParseError("Server did not return any payment options");
    }

    const requirements = response.accepts[0];
    return requirements;
  } catch (err) {
    if (err instanceof ZodError) {
      throw new X402ParseError(
        "Invalid 402 response format. Expected standard x402 structure.",
        err
      );
    }
    throw err;
  }
};

export const parse402PaymentHeader = (header: string): PaymentPayload => {
  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    const jsonData = JSON.parse(decoded);
    return paymentPayloadSchema.parse(jsonData);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new X402ParseError("Invalid X-PAYMENT header format", err);
    }
    if (err instanceof SyntaxError) {
      throw new X402ParseError("X-PAYMENT header is not valid JSON");
    }
    throw err;
  }
};

export const parseXPaymentResponse = (
  header: string
): {
  success: boolean;
  error: string | null;
  txHash: string | null;
  networkId: string | null;
} => {
  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    const jsonData = JSON.parse(decoded);
    return jsonData;
  } catch (err) {
    throw new X402ParseError("Invalid X-PAYMENT-RESPONSE header");
  }
};
