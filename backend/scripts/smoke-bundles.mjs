import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve("dist");
const handlers = readdirSync(dist, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(dist, entry.name, "index.js"));

if (handlers.length === 0) throw new Error("No Lambda bundles found; run npm run build first.");

for (const handler of handlers) {
  const result = spawnSync(process.execPath, ["-e", `require(${JSON.stringify(handler)})`], {
    encoding: "utf8",
    env: {
      ...process.env,
      AWS_REGION: process.env.AWS_REGION ?? "ap-southeast-1",
      MAPS_TRACE_URL: process.env.MAPS_TRACE_URL ?? "https://maps.invalid/trace_attributes",
    },
  });
  if (result.status !== 0) {
    throw new Error(`Cold import failed for ${handler}: ${result.stderr || result.stdout}`);
  }
}

console.log(`Cold-imported ${handlers.length} self-contained Lambda bundle(s).`);
