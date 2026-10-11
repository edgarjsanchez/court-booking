// Vercel Function: every /api/* request lands here (see vercel.json) and is
// handled by the same code that `npm run dev` runs locally (server/app.ts).
import type { IncomingMessage, ServerResponse } from "node:http";
import { handle } from "../server/app.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handle(req, res);
}
