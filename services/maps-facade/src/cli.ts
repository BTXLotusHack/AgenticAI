import { createTascoMockServer } from "./mock-server.js";

const host = process.env.TASCO_MOCK_HOST ?? "127.0.0.1";
const port = Number(process.env.TASCO_MOCK_PORT ?? "8787");

if (!Number.isInteger(port) || port < 0 || port > 65_535) {
  throw new Error("TASCO_MOCK_PORT must be an integer from 0 through 65535.");
}

const server = await createTascoMockServer({ host, port }).listen(port, host);
process.stdout.write(`Tasco Maps mock facade: ${server.url}\n`);

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await server.close();
  process.exitCode = 0;
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
