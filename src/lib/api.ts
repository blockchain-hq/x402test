import { PublicKey } from "@solana/web3.js";
import { AssertionError, X402Error } from "./errors.js";
import { parse402Response } from "./parser.js";
import { createPayment, createXPaymentHeader } from "./payment.js";
import { verifyPayment } from "./verify.js";
import { getWallet } from "./wallets.js";
import chalk from "chalk";
import { Cluster, logExplorerLink } from "./explorers.js";

export interface X402RequestConfig {
  amount?: string;
}

export interface X402Response<T> {
  status: number;
  statusText: string;
  headers: Headers;
  body: T;
  payment?: {
    signature: string;
    amount: string;
    from: string;
    to: string;
  };
}

interface Expectation {
  type: "status" | "payment_settled" | "payment_amount" | "body" | "header";
  value?: unknown;
  name?: string;
}

export class X402Request {
  private url: string;
  private method: string = "GET";
  private requestHeaders: Record<string, string> = {};
  private requestBody: unknown;
  private paymentAmount?: string;
  private expectations: Expectation[] = [];
  private cluster: Cluster = "localnet";

  constructor(url: string) {
    this.url = url;
  }

  get(): this {
    this.method = "GET";
    return this;
  }

  post(body: unknown): this {
    this.method = "POST";
    this.requestBody = body;
    return this;
  }

  put(body: unknown): this {
    this.method = "PUT";
    this.requestBody = body;
    return this;
  }

  delete(): this {
    this.method = "DELETE";
    return this;
  }

  header(name: string, value: string): this {
    this.requestHeaders[name] = value;
    return this;
  }

  headers(headers: Record<string, string>): this {
    this.requestHeaders = { ...this.requestHeaders, ...headers };
    return this;
  }

  body(body: unknown): this {
    this.requestBody = body;
    return this;
  }

  withPayment(config: { amount: string } | string): this {
    if (typeof config === "string") {
      this.paymentAmount = config;
    } else {
      this.paymentAmount = config.amount;
    }

    return this;
  }

  expectStatus(status: number): this {
    this.expectations.push({ type: "status", value: status });
    return this;
  }

  expectPaymentSettled(): this {
    this.expectations.push({ type: "payment_settled" });
    return this;
  }

  expectPaymentAmount(amount: string): this {
    this.expectations.push({ type: "payment_amount", value: amount });
    return this;
  }

  expectBody(matcher: unknown): this {
    this.expectations.push({ type: "body", value: matcher });
    return this;
  }

  expectHeader(name: string, value: unknown): this {
    this.expectations.push({ type: "header", name, value });
    return this;
  }

  private async makeRequest<T>(
    paymentHeader?: string
  ): Promise<X402Response<T>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.requestHeaders,
    };

    if (paymentHeader) {
      headers["X-PAYMENT"] = paymentHeader;
    }

    const options: RequestInit = {
      method: this.method,
      headers,
    };

    if (this.requestBody && this.method !== "GET") {
      options.body = JSON.stringify(this.requestBody);
    }

    const response = await fetch(this.url, options);

    let body: unknown;
    const contentType = response.headers.get("Content-Type");
    if (contentType?.includes("application/json")) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: body as T,
    };
  }

  async execute<T>(): Promise<X402Response<T>> {
    try {
      let response = await this.makeRequest<T>();
      if (response.status === 402 && this.paymentAmount) {
        response = await this.handlePaymentRequired<T>(response);
      }

      await this.checkExpectations(this.expectations, response);

      return response;
    } catch (err) {
      if (err instanceof X402Error || err instanceof AssertionError) {
        console.error(chalk.red(`Error executing request: ${err.message}`));
        console.error(chalk.red(`Stack trace: ${err.stack}`));
        throw err;
      }
      throw new X402Error(`Request failed: ${(err as Error).message}`);
    }
  }

  private async handlePaymentRequired<T>(
    res: X402Response<T>
  ): Promise<X402Response<T>> {
    const requirements = parse402Response(res.body);

    if (requirements.network) {
      this.cluster = requirements.network as Cluster;
    }

    if (this.paymentAmount) {
      const clientMaxAmount = parseFloat(this.paymentAmount) * 10 ** 6;
      const serverRequiredAmount = parseFloat(requirements.maxAmountRequired);

      if (clientMaxAmount < serverRequiredAmount) {
        throw new X402Error(
          `Client max amount ${clientMaxAmount} is less than server required amount ${serverRequiredAmount}`
        );
      }
    }

    const wallet = await getWallet();
    const signature = await createPayment(wallet, requirements);

    const paymentHeader = createXPaymentHeader(
      signature,
      requirements,
      wallet.publicKey.toBase58()
    );

    const newRes = await this.makeRequest<T>(paymentHeader);
    newRes.payment = {
      signature,
      amount: requirements.maxAmountRequired,
      from: wallet.publicKey.toBase58(),
      to: requirements.payTo,
    };

    return newRes;
  }

  private async checkExpectations<T>(
    expectations: Expectation[],
    res: X402Response<T>
  ): Promise<void> {
    for (const expectation of expectations) {
      await this.checkExpectation(expectation, res);
    }
  }

  private async checkExpectation<T>(
    expectation: Expectation,
    res: X402Response<T>
  ): Promise<void> {
    switch (expectation.type) {
      case "status":
        if (res.status !== expectation.value) {
          throw new AssertionError(
            `Expected status ${expectation.value} but got ${res.status}` +
              `\nBody: ${JSON.stringify(res.body)}`
          );
        }
        console.log(chalk.green("Status check passed"));
        break;

      case "payment_settled":
        if (!res.payment) {
          throw new AssertionError("Payment was not settled");
        }

        const wallet = await getWallet();
        const verification = await verifyPayment(
          res.payment.signature,
          new PublicKey(res.payment.to),
          BigInt(res.payment.amount),
          wallet.usdcMint,
          this.cluster
        );

        if (!verification.isValid) {
          throw new AssertionError(
            verification.invalidReason || "Payment verification failed"
          );
        }

        console.log(chalk.green("Payment settled on chain"));
        break;

      case "payment_amount":
        if (!res.payment) {
          throw new AssertionError("Payment was not settled");
        }

        const expectedAmount = BigInt(expectation.value as string);
        const actualAmount = BigInt(res.payment.amount);
        if (actualAmount !== expectedAmount) {
          throw new AssertionError(
            `Expected payment amount ${expectedAmount} but got ${actualAmount}`
          );
        }
        console.log(chalk.green("Payment amount check passed"));
        break;

      case "body":
        // if body is validated using function
        if (typeof expectation.value === "function") {
          if (!expectation.value(res.body)) {
            throw new AssertionError("Body validation failed");
          }
        } else {
          const expected = JSON.stringify(expectation.value);
          const actual = JSON.stringify(res.body);
          if (expected !== actual) {
            throw new AssertionError(
              `Expected body ${expected} but \nGot: ${actual}`
            );
          }
        }

        console.log(chalk.green("Body check passed"));
        break;

      case "header":
        const headerValue = res.headers.get(expectation.name || "");
        if (expectation.value instanceof RegExp) {
          if (!expectation.value.test(headerValue || "")) {
            throw new AssertionError(
              `Expected header ${expectation.name} to match ${expectation.value} but got ${headerValue}`
            );
          }
        } else {
          if (headerValue !== expectation.value) {
            throw new AssertionError(
              `Expected header ${expectation.name} to be ${expectation.value} but got ${headerValue}`
            );
          }
        }

        console.log(chalk.green("Header check passed"));
        break;
    }
  }

  // TODO: function to make the request awaitable
}

// aliases
export const x402 = (url: string) => {
  return new X402Request(url);
};

export const request = (url: string) => {
  return new X402Request(url);
};
