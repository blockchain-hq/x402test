import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

app.get("/protected", async (req: Request, res: Response) => {
  const xPaymentHeader = req.header["X-Payment"];
  if (!xPaymentHeader) {
  }
});
