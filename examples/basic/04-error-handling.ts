/**
 * Example 4: Error Handling
 *
 * Shows different error scenarios and how to handle them.
 *
 * Run: npx tsx examples/basic/04-error-handling.ts
 */

import { x402, X402Error } from "../../src/lib/index.js";

async function example() {
  console.log("✔ Example 4: Error Handling\n");

  // Scenario 1: Insufficient amount
  console.log("Scenario 1: Client specifies too low amount");
  try {
    await x402("http://localhost:4402/api/premium")
      .withPayment({ amount: "0.01" }) // Too low! Premium costs 0.10
      .expectStatus(200)
      .execute();

    console.log("✘ Should have failed!");
  } catch (error) {
    if (error instanceof X402Error) {
      console.log("✔ Correctly rejected:");
      console.log(`   ${error.message}\n`);
    }
  }

  // Scenario 2: Wrong status expected
  console.log("Scenario 2: Wrong status expectation");
  try {
    await x402("http://localhost:4402/api/test")
      .withPayment({ amount: "0.01" })
      .expectStatus(404) // Expecting wrong status
      .execute();

    console.log("✘ Should have failed!");
  } catch (error) {
    console.log("✔ Assertion failed as expected:");
    console.log(`   ${(error as Error).message}\n`);
  }

  // Scenario 3: Server unreachable
  console.log("Scenario 3: Server unreachable");
  try {
    await x402("http://localhost:9999/api/test") // Wrong port
      .withPayment({ amount: "0.01" })
      .expectStatus(200)
      .execute();

    console.log("✘ Should have failed!");
  } catch (error) {
    console.log("✔ Connection error handled:");
    console.log(`   ${(error as Error).message}\n`);
  }

  // Scenario 4: Graceful handling
  console.log("Scenario 4: Graceful error recovery");
  try {
    const response = await x402("http://localhost:4402/api/premium")
      .withPayment({ amount: "0.01" })
      .execute();

    console.log("Response:", response.status);
  } catch (error) {
    console.log("✔ Error caught and handled gracefully");
    console.log("   Application continues running...\n");
  }

  console.log("✔ All error scenarios handled correctly!");
}

example();
