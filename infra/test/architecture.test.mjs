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
