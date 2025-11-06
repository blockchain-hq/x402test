/**
 * Example 5: Replay Attack Prevention
 *
 * Demonstrates that the same payment signature cannot be reused,
 * protecting against replay attacks.
 *
 * Run: npx tsx examples/basic/05-replay-attack.ts
 */

async function example() {
  console.log("✔ Example 5: Replay Attack Prevention\n");

  try {
    // Make first payment
    console.log("✔ Making first payment...");
    const response1 = await fetch("http://localhost:4402/api/data", {
      method: "GET",
    });

    if (response1.status === 402) {
      console.log("✔ Payment required - creating payment...");

      // In real implementation, x402() handles this
      // For demo, we'll simulate getting the payment header

      // Make actual payment using x402test
      const { x402 } = await import("../../src/lib/index.js");

      const paidResponse = await x402("http://localhost:4402/api/data")
        .withPayment({ amount: "0.01" })
        .expectStatus(200)
        .execute();

      console.log("✔ First payment succeeded");
      console.log(
        `   Signature: ${paidResponse.payment?.signature?.substring(0, 16)}...`
      );

      // Try to reuse the same payment
      console.log("\n✔ Attempting to replay the same payment...");

      const { createXPaymentHeader } = await import("../../src/lib/payment.js");
      const { parse402Response } = await import("../../src/lib/parser.js");

      const initialResponse = await fetch("http://localhost:4402/api/data");
      const requirements = parse402Response(await initialResponse.json());
      const paymentHeader = createXPaymentHeader(
        paidResponse.payment!.signature,
        requirements,
        paidResponse.payment!.from
      );

      // Manually construct request with same payment header
      const replayResponse = await fetch("http://localhost:4402/api/data", {
        method: "GET",
        headers: { "X-Payment": paymentHeader },
      });

      if (replayResponse.status === 402) {
        const body = await replayResponse.json();
        console.log("✔ Replay attack prevented!");
        console.log(`   Server response: ${body.error}`);
        console.log("\n✔ Security working as expected!");
      } else {
        console.log(
          "✘ WARNING: Replay attack succeeded (this should not happen!)"
        );
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("✘ Error:", error);
    process.exit(1);
  }
}

console.log("Prerequisites:");
console.log("1. Validator running: solana-test-validator");
console.log("2. Server running: x402test start");
console.log("");

example();
