/**
 * Example 1: Simple Payment
 *
 * The most basic x402 usage - make a request that requires payment.
 *
 * Run: npx tsx examples/basic/01-simple-payment.ts
 */

import { x402 } from "../../src/lib/index.js";

async function example() {
  console.log("✔ Example 1: Simple Payment\n");

  try {
    // make a request to a payment-protected endpoint
    const response = await x402("http://localhost:4402/api/data")
      .withPayment({ amount: "0.01" }) // willing to pay up to 0.01 USDC
      .expectStatus(200) // expect success
      .execute();

    console.log("✔ Payment successful!");
    console.log("Response:", JSON.stringify(response.body, null, 2));
    console.log("Payment signature:", response.payment?.signature);
  } catch (error) {
    console.error("✘ Payment failed:", error);
    process.exit(1);
  }
}

// prerequisites check
console.log("Prerequisites:");
console.log("1. Validator running: solana-test-validator");
console.log("2. Server running: x402test start");
console.log("");

example();
