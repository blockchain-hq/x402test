/**
 * Example 2: Handling 402 Payment Required
 *
 * Shows what happens when you don't provide payment,
 * and how to inspect the payment requirements.
 *
 * Run: npx tsx examples/basic/02-payment-required.ts
 */

import { x402 } from "../../src/lib/index.js";

async function example() {
  console.log("✔ Example 2: Understanding 402 Responses\n");

  try {
    // First request WITHOUT payment - will get 402
    console.log("Making a request without payment...");
    const response = await fetch("http://localhost:4402/api/premium");

    if (response.status === 402) {
      console.log("✔ Received 402 Payment Required");

      const requirements = await response.json();
      console.log("\nPayment Requirements:");
      console.log(
        `   Amount: ${requirements.accepts[0].maxAmountRequired} atomic units`
      );
      console.log(
        `   Price: ${(
          parseInt(requirements.accepts[0].maxAmountRequired) / 1e6
        ).toFixed(2)} USDC`
      );
      console.log(`   Pay to: ${requirements.accepts[0].payTo}`);
      console.log(`   Asset: ${requirements.accepts[0].asset}`);
      console.log(`   Description: ${requirements.accepts[0].description}`);
    }

    // Now make the same request WITH payment
    console.log("\n✔ Making request with payment...");
    const paidResponse = await x402("http://localhost:4402/api/premium")
      .withPayment({ amount: "0.10" })
      .expectStatus(200)
      .execute();

    console.log("✔ Payment accepted!");
    console.log("Response:", JSON.stringify(paidResponse.body, null, 2));
  } catch (error) {
    console.error("✘ Error:", error);
    process.exit(1);
  }
}

example();
