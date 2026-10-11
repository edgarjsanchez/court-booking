import { createServer } from "node:http";
import { env, missingEnv } from "./env.js";

const missing = missingEnv();
if (missing.length) {
  console.log(
    `[api] Not started: ${missing.join(", ")} missing in .env.\n` +
      `[api] The app still runs in demo mode (data saved in your browser). See README to connect Neon.`,
  );
  process.exit(0);
}

// Imported after the env check so a missing .env gives the friendly message above.
const { handle } = await import("./app.js");

createServer((req, res) => void handle(req, res)).listen(env.PORT, () => {
  console.log(`[api] Booking API on http://localhost:${env.PORT}`);
});
