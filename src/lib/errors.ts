import { ZodError } from "zod";

export class X402Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "X402Error";
  }
}

export class X402ParseError extends X402Error {
  constructor(message: string, public zodError?: ZodError) {
    super(message);
    this.name = "X402ParseError";

    if (zodError) {
      this.message += "\n" + formatZodErrors(zodError);
    }
  }
}

export class PaymentCreationError extends X402Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "PaymentCreationError";

    if (cause) {
      this.message += `\nCaused by: ${cause.message}`;
    }
  }
}

export class PaymentVerificationError extends X402Error {
  constructor(
    message: string,
    public signature?: string,
    public reason?: string
  ) {
    super(message);
    this.name = "PaymentVerificationError";

    if (signature) {
      this.message += `\nSignature: ${signature}`;
    }
    if (reason) {
      this.message += `\nReason: ${reason}`;
    }
  }
}

export class AssertionError extends X402Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

const formatZodErrors = (err: ZodError): string => {
  return err.issues
    .map((e) => {
      const path = e.path.length > 0 ? e.path.join(".") : "root";
      return `  • ${path}: ${e.message}`;
    })
    .join("\n");
};
