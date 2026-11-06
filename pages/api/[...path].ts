import type { NextApiRequest, NextApiResponse } from "next";
import app from "../../server/app";
// Preserve the raw Node request for existing JSON/multipart parsing and CSRF rules.
export const config = { api: { bodyParser: false, externalResolver: true } };
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use the actual TCP peer for rate limiting; never trust caller-supplied forwarding headers.
  delete req.headers["x-forwarded-for"];
  delete req.headers.forwarded;
  return app(req, res);
}
