/**
 * Example 3: Multiple Protected Endpoints
 *
 * Shows how to interact with multiple endpoints that have
 * different payment requirements.
 *
 * Run: npx tsx examples/basic/03-multiple-endpoints.ts
 */

import { x402 } from "../../src/lib/index.js";

async function example() {
  console.log("✔ Example 3: Multiple Endpoints\n");

  try {
    // Cheap endpoint - 0.01 USDC
    console.log("Making a request to the cheap endpoint (/api/test)...");
    const response1 = await x402("http://localhost:4402/api/data")
      .withPayment({ amount: "0.01" })
      .expectStatus(200)
      .execute();

    console.log("✔ Test endpoint accessed");
    console.log(`   Cost: 0.01 USDC`);
    console.log(`   Data: ${JSON.stringify(response1.body)}\n`);

    // Expensive endpoint - 0.10 USDC
    console.log("Making a request to the premium endpoint (/api/premium)...");
    const response2 = await x402("http://localhost:4402/api/premium")
      .withPayment({ amount: "0.10" })
      .expectStatus(200)
      .execute();

    console.log("✔ Premium endpoint accessed");
    console.log(`   Cost: 0.10 USDC`);
    console.log(`   Data: ${JSON.stringify(response2.body)}\n`);

    // Summary
    console.log("✔ Summary:");
    console.log(`   Total spent: 0.11 USDC`);
    console.log(`   Requests made: 2`);
    console.log(`   All payments verified on-chain ✔`);
  } catch (error) {
    console.error("✘ Error:", error);
    process.exit(1);
  }
}

example();
