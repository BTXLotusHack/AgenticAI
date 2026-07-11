import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("realtime subscriptions require current caller membership", async () => {
  const realtime = await read("modules/realtime/main.tf");
  assert.match(realtime, /type\s*=\s*"Subscription"/);
  assert.match(realtime, /field\s*=\s*"onRiderPosition"/);
  assert.match(realtime, /USER#\$ctx\.identity\.sub/);
  assert.match(realtime, /TEAM#\$ctx\.arguments\.teamId/);
  assert.match(realtime, /\$util\.unauthorized\(\)/);
});

test("IoT records carry broker-derived identity and Kinesis partial failures are enabled", async () => {
  const telemetry = await read("modules/telemetry/main.tf");
  assert.match(telemetry, /topic\(2\) AS _topicTeamId/);
  assert.match(telemetry, /topic\(4\) AS _topicRiderId/);
  assert.match(telemetry, /principal\(\) AS _publisherPrincipal/);
  assert.match(telemetry, /ReportBatchItemFailures/);
  assert.match(telemetry, /destination_config/);
});

test("shared Terraform state is encrypted, versioned and locked", async () => {
  const backend = await read("backend.tf");
  const bootstrap = await read("bootstrap/main.tf");
  assert.match(backend, /backend "s3"/);
  assert.match(backend, /use_lockfile\s*=\s*true/);
  assert.match(bootstrap, /prevent_destroy\s*=\s*true/);
  assert.match(bootstrap, /versioning_configuration\s*\{\s*status\s*=\s*"Enabled"/s);
  assert.match(bootstrap, /DenyInsecureTransport/);
});

test("web hosting uses a private S3 origin and CloudFront OAC", async () => {
  const web = await read("modules/web/main.tf");
  assert.match(web, /aws_cloudfront_origin_access_control/);
  assert.match(web, /block_public_policy\s*=\s*true/);
  assert.match(web, /viewer_protocol_policy\s*=\s*"redirect-to-https"/);
  assert.match(web, /response_headers_policy_id/);
  assert.match(web, /response_page_path\s*=\s*"\/index.html"/);
});

test("development deployment is manual and uses GitHub OIDC", async () => {
  const workflow = await read("../.github/workflows/deploy-development.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /configure-aws-credentials@v6\.1\.2/);
  assert.match(workflow, /inputs\.confirmation == 'DEPLOY_DEV'/);
  assert.doesNotMatch(workflow, /AWS_ACCESS_KEY_ID/);
});
