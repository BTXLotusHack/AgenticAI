import { build } from "esbuild";
import { rm } from "node:fs/promises";

/**
 * Bundles each Lambda handler into dist/<name>/index.js (CommonJS, node22).
 * Terraform's archive_file zips these directories for deployment — Terraform
 * does not compile TypeScript itself, so this build step must run before
 * `terraform apply`. AWS SDK v3 is provided by the Lambda runtime and is
 * marked external to keep bundles small.
 */
const HANDLERS = {
  "telemetry-processor": "src/handlers/telemetry-processor.ts",
  "create-team": "src/handlers/create-team.ts",
  "invite-user": "src/handlers/invite-user.ts",
  "upsert-profile": "src/handlers/upsert-profile.ts",
  "get-profile": "src/handlers/get-profile.ts",
  "accept-invite": "src/handlers/accept-invite.ts",
  "transfer-leader": "src/handlers/transfer-leader.ts",
  "list-my-teams": "src/handlers/list-my-teams.ts",
  "list-team-members": "src/handlers/list-team-members.ts",
  "remove-member": "src/handlers/remove-member.ts",
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
      external: ["@aws-sdk/*", "@smithy/*", "@aws-crypto/*"],
    }),
  ),
);

console.log(`Built ${Object.keys(HANDLERS).length} handler bundle(s) into dist/`);
