import { z } from "zod";

export const X402_VERSION = 1;

const solanaAddressSchema = z
  .string()
  .length(44, "Solana address must be 44 characters long")
  .regex(/^[1-9A-HJ-NP-Za-km-z]{44}$/, "Invalid Solana address format");

const signatureSchema = z
  .string()
  .min(87, "Signature too short")
  .max(88, "Signature too long")
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "Invalid signature format");

const uint256StringSchema = z
  .string()
  .regex(/^\d+$/, "Must be numeric string representing uint256");

export const paymentRequirementsSchema = z.object({
  scheme: z.string(), // schema of the payment protocol
  network: z.string(),
  maxAmountRequired: uint256StringSchema, // max amount required to pay for resource in smallest unit
  resource: z.url(), // resource url to pay for
  description: z.string().optional(),
  mimeType: z.string().optional(),
  outputSchema: z.object({}).loose().nullable().optional(), // output schema of resource response
  payTo: solanaAddressSchema,
  maxTimeoutSeconds: z.number().int().positive().optional(),
  asset: solanaAddressSchema, // asset address - SPL token mint
  extra: z.object({}).loose().nullable().optional(),
});

// payment required response
export const paymentRequiredResponseSchema = z.object({
  x402Version: z.number().int().positive(),
  accepts: z
    .array(paymentRequirementsSchema)
    .min(1, "Must have at least one payment option"),
  error: z.string().optional().nullable(),
});

// solana-specific payment payload
export const solanaPaymentPayloadSchema = z.object({
  signature: signatureSchema,
  from: solanaAddressSchema,
  amount: uint256StringSchema,
  mint: solanaAddressSchema,
  timestamp: z.number().int().positive(),
});

export const paymentPayloadSchema = z.object({
  x402Version: z.number().int().positive(),
  scheme: z.string(),
  network: z.string(),
  payload: solanaPaymentPayloadSchema,
});

export const verificationResultSchema = z.object({
  isValid: z.boolean(),
  invalidReason: z.string().nullable(),
  txHash: z.string().optional(),
  amount: z.string().optional(),
});

export type VerificationResult = z.infer<typeof verificationResultSchema>;
export type PaymentRequirements = z.infer<typeof paymentRequirementsSchema>;
export type PaymentRequiredResponse = z.infer<
  typeof paymentRequiredResponseSchema
>;
export type SolanaPaymentPayload = z.infer<typeof solanaPaymentPayloadSchema>;
export type PaymentPayload = z.infer<typeof paymentPayloadSchema>;
