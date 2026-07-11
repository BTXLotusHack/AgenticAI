import type { KinesisStreamEvent } from "aws-lambda";
import { beforeAll, describe, expect, it } from "vitest";

let handler: (event: KinesisStreamEvent) => Promise<{ batchItemFailures: Array<{ itemIdentifier: string }> }>;

beforeAll(async () => {
  process.env.MAPS_TRACE_URL = "https://maps.invalid/trace_attributes";
  ({ handler } = await import("../src/handlers/telemetry-processor.js"));
});

function eventWith(data: unknown, sequenceNumber: string): KinesisStreamEvent {
  return {
    Records: [
      {
        eventID: `shard:${sequenceNumber}`,
        eventName: "aws:kinesis:record",
        eventVersion: "1.0",
        eventSource: "aws:kinesis",
        eventSourceARN: "arn:aws:kinesis:ap-southeast-1:123456789012:stream/test",
        awsRegion: "ap-southeast-1",
        invokeIdentityArn: "arn:aws:iam::123456789012:role/test",
        kinesis: {
          kinesisSchemaVersion: "1.0",
          partitionKey: "t1",
          sequenceNumber,
          data: Buffer.from(JSON.stringify(data), "utf8").toString("base64"),
          approximateArrivalTimestamp: 0,
        },
      },
    ],
  };
}

describe("telemetry processor partial failures", () => {
  it("reports an unbound telemetry record by Kinesis sequence number", async () => {
    const response = await handler(eventWith({ teamId: "t1", riderId: "r1" }, "42"));
    expect(response).toEqual({ batchItemFailures: [{ itemIdentifier: "42" }] });
  });
});
