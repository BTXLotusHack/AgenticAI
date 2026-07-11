import { createDefaultLocalServer } from "./default-runtime";

const host = process.env.LOOPIN_LOCAL_HOST ?? "127.0.0.1";
const port = Number(process.env.LOOPIN_LOCAL_PORT ?? "8787");

if (!Number.isInteger(port) || port < 0 || port > 65_535) {
  throw new Error("LOOPIN_LOCAL_PORT must be an integer from 0 through 65535.");
}

const server = await createDefaultLocalServer().listen(port, host);
process.stdout.write(`Loopin local services: ${server.url}\n`);
process.stdout.write(`Loopin local realtime: ${server.wsUrl}/v1/realtime\n`);

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await server.close();
  process.exitCode = 0;
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
