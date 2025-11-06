# x402test

<p align="center">
  <img src="public/x402test-logo.png" alt="x402test Logo" width="200"/>
</p>

A testing framework for x402 payment flows on Solana. Build, test, and validate micropayment-protected APIs using USDC on Solana's devnet.

## Overview

x402test provides a complete toolkit for developing and testing HTTP 402 Payment Required flows with Solana blockchain payments. It includes both a testing client for making payment-protected requests and a mock server for simulating payment-protected endpoints.

The x402 protocol enables micropayments for API access, allowing services to charge per-request fees in USDC. This is particularly useful for AI agents, premium APIs, and pay-per-use services.

## Features

- **Simple Testing API**: Fluent interface for making payment-protected HTTP requests
- **Mock Server**: Quickly spin up payment-protected endpoints for testing
- **Automatic Payment Handling**: Automatically detects 402 responses and processes payments
- **On-Chain Verification**: Validates all payments are settled on Solana blockchain
- **Replay Attack Protection**: Built-in protection against transaction replay attacks
- **CLI Tools**: Initialize projects and start test servers with simple commands
- **Test Wallet Management**: Automatic test wallet creation and USDC funding
- **TypeScript Support**: Full type safety and autocomplete

## Installation

```bash
npm install x402test
```

Or with pnpm:

```bash
pnpm add x402test
```

## Quick Start

### 1. Initialize a new project

```bash
npx x402test init
```

This creates a `x402test.config.js` file with default configuration and a test wallet.

### 2. Start the test server

```bash
npx x402test start
```

The server will run on port 4402 by default with pre-configured payment-protected routes.

### 3. Make a payment-protected request

```typescript
import { x402 } from "x402test";

const response = await x402("http://localhost:4402/api/premium")
  .withPayment({ amount: "0.10" })
  .expectStatus(200)
  .execute();

console.log("Payment successful!", response.body);
console.log("Transaction:", response.payment?.signature);
```

## Prerequisites

For local development and testing, you need a Solana test validator running:

```bash
solana-test-validator
```

This provides a local Solana blockchain for testing payments without using real money.

## CLI Commands

### `x402test init`

Initialize a new x402test project with configuration file and test wallet.

```bash
x402test init [options]

Options:
  --force    Overwrite existing configuration
```

### `x402test start`

Start the mock payment-protected server.

```bash
x402test start [options]

Options:
  --config <path>    Path to config file (default: ./x402test.config.js)
  --port <number>    Port to run server on (default: 4402)
```

### `x402test routes`

List all configured payment-protected routes.

```bash
x402test routes [options]

Options:
  --config <path>    Path to config file
```

## Configuration

The `x402test.config.js` file defines your payment-protected endpoints:

```javascript
export default {
  port: 4402,
  network: "solana-devnet",
  rpcUrl: "http://localhost:8899",

  // Wallet address that receives payments
  recipient: "FcxKSp2ZuafseVoNgMpHQ5sXjGb9PjzXFpnvpR8aAVRo",

  // Define payment-protected routes
  routes: {
    "/api/premium": {
      price: "0.10", // Price in USDC
      description: "Premium content access",
      response: {
        data: "This is premium content!",
        timestamp: Date.now(),
      },
    },

    "/api/data": {
      price: "0.01",
      description: "Data API access",
      // Dynamic response based on request
      response: (req) => ({
        method: req.method,
        path: req.path,
        data: { message: "Your data here" },
      }),
    },
  },
};
```

## Client API

### Creating a Request

```typescript
import { x402 } from "x402test";

// Simple GET request
x402("http://localhost:4402/api/data").withPayment("0.01").execute();

// POST request with body
x402("http://localhost:4402/api/data")
  .post({ key: "value" })
  .withPayment({ amount: "0.01" })
  .execute();

// With custom headers
x402("http://localhost:4402/api/data")
  .header("X-Custom-Header", "value")
  .withPayment("0.01")
  .execute();
```

### HTTP Methods

```typescript
// GET
x402(url).get().execute();

// POST
x402(url).post({ data: "value" }).execute();

// PUT
x402(url).put({ data: "value" }).execute();

// DELETE
x402(url).delete().execute();
```

### Payment Configuration

```typescript
// Specify maximum amount willing to pay
x402(url).withPayment({ amount: "0.10" }).execute();

// Shorthand
x402(url).withPayment("0.10").execute();
```

If the server requests a payment higher than your specified amount, the request will fail.

### Assertions and Expectations

Chain expectations to validate responses:

```typescript
await x402(url)
  .withPayment("0.01")
  .expectStatus(200) // Expect HTTP 200
  .expectPaymentSettled() // Verify payment on blockchain
  .expectPaymentAmount("1000000") // Verify amount (in atomic units)
  .expectBody({ success: true }) // Expect specific body
  .expectHeader("Content-Type", "application/json") // Check headers
  .execute();
```

#### Custom Body Validation

```typescript
// Using a validation function
await x402(url)
  .withPayment("0.01")
  .expectBody((body) => {
    return body.data && body.data.length > 0;
  })
  .execute();
```

## Response Object

The `execute()` method returns an `X402Response` object:

```typescript
interface X402Response<T> {
  status: number; // HTTP status code
  statusText: string; // HTTP status text
  headers: Headers; // Response headers
  body: T; // Parsed response body
  payment?: {
    // Payment details (if payment was made)
    signature: string; // Solana transaction signature
    amount: string; // Amount paid (atomic units)
    from: string; // Payer wallet address
    to: string; // Recipient wallet address
  };
}
```

## Understanding 402 Payment Required

When you make a request to a payment-protected endpoint without payment, you'll receive a 402 response:

```typescript
const response = await fetch("http://localhost:4402/api/premium");

if (response.status === 402) {
  const requirements = await response.json();
  /*
  {
    x402Version: 1,
    accepts: [{
      scheme: "solana-spl",
      network: "solana-devnet",
      maxAmountRequired: "100000",  // 0.10 USDC in atomic units
      resource: "http://localhost:4402/api/premium",
      description: "Premium content access",
      payTo: "FcxKSp...",           // Recipient address
      asset: "EPjFWdd..."           // USDC mint address
    }]
  }
  */
}
```

The x402test client automatically handles this flow for you when you use `.withPayment()`.

## Examples

### Basic Payment Flow

```typescript
import { x402 } from "x402test";

// Make a request that requires payment
const response = await x402("http://localhost:4402/api/data")
  .withPayment({ amount: "0.01" })
  .expectStatus(200)
  .execute();

console.log("Response:", response.body);
console.log("Payment signature:", response.payment?.signature);
```

### Multiple Endpoints

```typescript
// Cheap endpoint
const dataResponse = await x402("http://localhost:4402/api/data")
  .withPayment("0.01")
  .expectStatus(200)
  .execute();

// Premium endpoint
const premiumResponse = await x402("http://localhost:4402/api/premium")
  .withPayment("0.10")
  .expectStatus(200)
  .execute();

console.log(
  `Total spent: ${
    parseFloat(dataResponse.payment.amount) +
    parseFloat(premiumResponse.payment.amount)
  } atomic units`
);
```

### Error Handling

```typescript
try {
  const response = await x402("http://localhost:4402/api/premium")
    .withPayment("0.05") // Not enough!
    .expectStatus(200)
    .execute();
} catch (error) {
  if (error.message.includes("less than server required")) {
    console.error("Payment amount too low");
  }
}
```

### AI Agent with Budget

```typescript
class Agent {
  private budget: number;
  private spent: number = 0;

  constructor(budget: number) {
    this.budget = budget;
  }

  async fetchData(endpoint: string, cost: number) {
    if (this.spent + cost > this.budget) {
      throw new Error("Budget exceeded");
    }

    const response = await x402(endpoint)
      .withPayment(cost.toString())
      .expectStatus(200)
      .execute();

    this.spent += cost;
    return response.body;
  }

  getRemainingBudget() {
    return this.budget - this.spent;
  }
}

const agent = new Agent(1.0); // $1 USDC budget

await agent.fetchData("http://localhost:4402/api/data", 0.01);
await agent.fetchData("http://localhost:4402/api/premium", 0.1);

console.log(`Remaining budget: ${agent.getRemainingBudget()} USDC`);
```

### Payment Verification

```typescript
const response = await x402("http://localhost:4402/api/premium")
  .withPayment("0.10")
  .expectStatus(200)
  .expectPaymentSettled() // Verifies transaction on blockchain
  .execute();

// Manual verification
import { verifyPayment } from "x402test";

const verification = await verifyPayment(
  response.payment.signature,
  new PublicKey(response.payment.to),
  BigInt(response.payment.amount),
  usdcMintAddress
);

if (verification.isValid) {
  console.log("Payment verified on-chain");
} else {
  console.error("Invalid payment:", verification.invalidReason);
}
```

## Replay Attack Protection

x402test includes built-in replay attack protection. Once a transaction signature is used, it cannot be reused:

```typescript
// First request succeeds
await x402("http://localhost:4402/api/data").withPayment("0.01").execute();

// Attempting to reuse the same transaction will fail
// The server tracks used signatures in .x402test-signatures.json
```

## Testing with Vitest

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { x402 } from "x402test";

describe("Payment Flow", () => {
  beforeAll(async () => {
    // Start your test server
  });

  it("should process payment successfully", async () => {
    const response = await x402("http://localhost:4402/api/data")
      .withPayment("0.01")
      .expectStatus(200)
      .expectPaymentSettled()
      .execute();

    expect(response.payment).toBeDefined();
    expect(response.payment?.signature).toMatch(
      /^[1-9A-HJ-NP-Za-km-z]{87,88}$/
    );
  });

  it("should reject insufficient payment", async () => {
    await expect(
      x402("http://localhost:4402/api/premium")
        .withPayment("0.05") // Server requires 0.10
        .execute()
    ).rejects.toThrow();
  });
});
```

## Programmatic Server

You can also start the server programmatically in your tests:

```typescript
import { startServer } from "x402test/server";

const config = {
  port: 4402,
  network: "solana-devnet",
  rpcUrl: "http://localhost:8899",
  recipient: "YOUR_WALLET_ADDRESS",
  routes: {
    "/api/test": {
      price: "0.01",
      description: "Test endpoint",
      response: { success: true },
    },
  },
};

await startServer(config);
```

## Project Structure

The examples directory contains working demonstrations:

```
examples/
  basic/
    01-simple-payment.ts          # Basic payment flow
    02-payment-required.ts        # Understanding 402 responses
    03-multiple-endpoints.ts      # Multiple payment requests
    04-error-handling.ts          # Error scenarios
    05-replay-attack.ts           # Replay protection demo
  agents/
    01-weather-agent.ts           # AI agent with budget management
```

Run any example:

```bash
npx tsx examples/basic/01-simple-payment.ts
```

## How It Works

1. **Request without payment**: Client makes initial request to payment-protected endpoint
2. **402 Response**: Server responds with payment requirements (amount, recipient, asset)
3. **Payment Creation**: Client creates and signs a Solana SPL token transfer transaction
4. **Request with payment**: Client retries request with `X-PAYMENT` header containing transaction signature
5. **Server Verification**: Server verifies the transaction on Solana blockchain
6. **Response**: Server returns the protected content

## Token Format

The `X-PAYMENT` header contains a base64-encoded JSON payload:

```typescript
{
  x402Version: 1,
  scheme: "solana-spl",
  network: "solana-devnet",
  payload: {
    signature: "5Xz...",          // Transaction signature
    from: "FcxK...",              // Payer address
    amount: "100000",             // Amount in atomic units
    mint: "EPjF...",              // Token mint (USDC)
    timestamp: 1699564800000      // Unix timestamp
  }
}
```

## Wallet Management

Test wallets are automatically managed in `.x402test-wallets.json`. Each wallet is pre-funded with test USDC using the `solana-test-wallets` package.

## Troubleshooting

### "Insufficient balance" error

Make sure `solana-test-validator` is running and your test wallet has been funded. The wallet is automatically funded when you run `x402test init`.

### "Connection refused" error

Ensure the x402test server is running:

```bash
x402test start
```

### "Payment verification failed"

This usually means:

- The transaction wasn't confirmed on-chain yet (wait a moment)
- The transaction amount doesn't match the requirement
- The recipient address is incorrect

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Links

- GitHub: https://github.com/blockchain-hq/x402test
- npm: https://www.npmjs.com/package/x402test

## Related Projects

- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
- [solana-test-wallets](https://github.com/blockchain-hq/solana-test-wallets)
