import { build } from "esbuild";
import { rm } from "node:fs/promises";

/**
 * Bundles each Lambda handler into dist/<name>/index.js (CommonJS, node22).
 * Terraform's archive_file zips these directories for deployment — Terraform
 * does not compile TypeScript itself, so this build step must run before
 * `terraform apply`. Runtime dependencies are bundled for reproducible cold
 * starts instead of relying on the SDK version installed by Lambda.
 */
const HANDLERS = {
  "telemetry-processor": "src/handlers/telemetry-processor.ts",
  "create-team": "src/handlers/create-team.ts",
  "invite-user": "src/handlers/invite-user.ts",
};

await rm("dist", { recursive: true, force: true });

await Promise.all(
  Object.entries(HANDLERS).map(([name, entry]) =>
    build({
      entryPoints: [entry],
      outfile: `dist/${name}/index.js`,
      bundle: true,
      platform: "node",
      target: "node22",
      format: "cjs",
      minify: true,
      sourcemap: false,
    }),
  ),
);

console.log(`Built ${Object.keys(HANDLERS).length} handler bundle(s) into dist/`);
