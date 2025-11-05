/**
 * Integration Test: Complete Payment Flow
 *
 * Run: npx tsx tests/integration/payment-flow.test.ts
 */

import { x402 } from "../../src/lib/index.js";

let testsPassed = 0;
let testsFailed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    console.log(`\n✔ Test: ${name}`);
    await fn();
    console.log(`✔ PASSED`);
    testsPassed++;
  } catch (error) {
    console.error(`✘ FAILED:`, (error as Error).message);
    testsFailed++;
  }
}

async function runTests() {
  console.log("✔ Running Payment Flow Integration Tests\n");

  await test("Should handle 402 response correctly", async () => {
    const response = await fetch("http://localhost:4402/api/data");
    if (response.status !== 402) {
      throw new Error(`Expected 402, got ${response.status}`);
    }
  });

  await test("Should complete payment successfully", async () => {
    const response = await x402("http://localhost:4402/api/data")
      .withPayment({ amount: "0.01" })
      .expectStatus(200)
      .execute();

    if (!response.payment?.signature) {
      throw new Error("No payment signature returned");
    }
  });

  await test("Should verify payment on-chain", async () => {
    const response = await x402("http://localhost:4402/api/data")
      .withPayment({ amount: "0.01" })
      .expectPaymentSettled()
      .execute();

    // Payment settled means it's verified on-chain
  });

  await test("Should reject insufficient amount", async () => {
    try {
      await x402("http://localhost:4402/api/premium")
        .withPayment({ amount: "0.01" }) // Too low
        .execute();
      throw new Error("Should have rejected low amount");
    } catch (error) {
      // Expected to fail
      if (!(error as Error).message.includes("required")) {
        throw error;
      }
    }
  });

  await test("Should handle multiple sequential payments", async () => {
    for (let i = 0; i < 3; i++) {
      await x402("http://localhost:4402/api/data")
        .withPayment({ amount: "0.01" })
        .expectStatus(200)
        .execute();
    }
  });

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`✔ Test Results:`);
  console.log(`   Passed: ${testsPassed}`);
  console.log(`   Failed: ${testsFailed}`);
  console.log(`   Total: ${testsPassed + testsFailed}`);
  console.log(`${"=".repeat(50)}\n`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
