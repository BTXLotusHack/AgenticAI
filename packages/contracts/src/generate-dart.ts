import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createGoldenR001Input, createGoldenR001Replay } from "@loopin/demo-scenarios";
import { FetchingJSONSchemaStore, InputData, JSONSchemaInput, quicktype } from "quicktype-core";

import { exportContractSchemas } from "./export-schemas";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageDirectory, "../..");
const generatedDirectory = resolve(packageDirectory, "generated");
const dartOutputPath = resolve(repositoryRoot, "apps/mobile/lib/contracts/generated/loopin_contracts.dart");
const checkOnly = process.argv.includes("--check");

type Output = { readonly path: string; readonly contents: string };

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function createExamples(): unknown {
  const validInput = createGoldenR001Input(2, 30);
  const frames = createGoldenR001Replay();
  const split = frames.find((frame) => frame.situationTransition === "confirmed");
  if (!split?.situation || !split.notifications[0]) throw new Error("Golden split fixture is incomplete.");
  const driverNotification = split.notifications.find((notification) => notification.recipientMemberId === "M004");
  if (!driverNotification) throw new Error("Golden split fixture is missing a driver notification for M004.");

  const eventEnvelope = {
    schemaVersion: 1,
    eventId: `accepted:${validInput.telemetry.eventId}`,
    eventType: "MemberLocationAccepted",
    occurredAt: validInput.telemetry.observedAt,
    producedAt: validInput.telemetry.sentAt,
    correlationId: "golden-r001",
    causationId: validInput.telemetry.eventId,
    tripId: validInput.telemetry.tripId,
    producer: "golden-scenario",
    payload: { memberId: validInput.telemetry.memberId, sequence: validInput.telemetry.sequence },
  };
  const memberTelemetryInput = {
    schemaVersion: 1,
    telemetry: validInput.telemetry,
    transport: "simulator",
    publishedAt: validInput.telemetry.sentAt,
    offlineQueueDepth: 0,
  };
  const liveSnapshot = {
    schemaVersion: 1,
    tripId: validInput.telemetry.tripId,
    snapshotRevision: split.graph.graphRevision,
    generatedAt: split.occurredAt,
    viewer: { memberId: "M004", role: "member" },
    members: split.nodes.map((node, index) => ({
      memberId: node.memberId,
      tripId: node.tripId,
      role: node.role,
      latitude: validInput.telemetry.latitude,
      longitude: validInput.telemetry.longitude + index * 0.0001,
      snappedLatitude: validInput.telemetry.latitude,
      snappedLongitude: validInput.telemetry.longitude + index * 0.0001,
      routeProgressMeters: node.routeProgressMeters,
      routeDeviationMeters: node.routeDeviationMeters,
      speedKmh: node.speedKmh,
      headingDegrees: node.headingDegrees,
      accuracyMeters: node.accuracyMeters,
      observedAt: node.observedAt,
      receivedAt: split.occurredAt,
      sequence: split.elapsedSeconds * 10 + index + 1,
      sourceTelemetryEventId: `gps:${split.elapsedSeconds}:${node.memberId}`,
      confidence: node.confidence,
      connectivity: node.connectivity,
      policyVersion: split.graph.policyVersion,
    })),
    graph: split.graph,
    situations: [split.situation],
    recommendations: [],
    notifications: split.notifications.filter((notification) => notification.recipientMemberId === "M004"),
  };
  const convoySituationEvent = {
    schemaVersion: 1,
    eventId: `situation:${split.situation.situationId}:${split.graph.graphRevision}`,
    tripId: validInput.telemetry.tripId,
    snapshotRevision: liveSnapshot.snapshotRevision,
    graphRevision: split.graph.graphRevision,
    eventType: "convoySituationCreated",
    occurredAt: split.occurredAt,
    situation: split.situation,
  };
  const driverAlert = {
    schemaVersion: 1,
    alertId: `alert:${driverNotification.notificationId}`,
    tripId: validInput.telemetry.tripId,
    recipientMemberId: driverNotification.recipientMemberId,
    issuedAt: driverNotification.createdAt,
    expiresAt: driverNotification.expiresAt,
    notification: driverNotification,
    requiresAcknowledgement: driverNotification.severity !== "info",
  };
  const driverAlertAcknowledgement = {
    schemaVersion: 1,
    acknowledgementId: `ack:${driverNotification.notificationId}`,
    alertId: driverAlert.alertId,
    notificationId: driverNotification.notificationId,
    tripId: validInput.telemetry.tripId,
    memberId: driverNotification.recipientMemberId,
    acknowledgedAt: driverNotification.createdAt,
    idempotencyKey: `ack:${driverNotification.notificationId}`,
  };
  const realtimeEvent = {
    schemaVersion: 1,
    eventId: `realtime:${split.graph.graphRevision}:M004`,
    tripId: validInput.telemetry.tripId,
    snapshotRevision: liveSnapshot.snapshotRevision,
    graphRevision: split.graph.graphRevision,
    audience: { kind: "member", memberId: "M004" },
    eventType: "driverAlertIssued",
    occurredAt: split.occurredAt,
    expiresAt: driverNotification.expiresAt,
    payload: driverAlert,
  };
  const duplicate = createGoldenR001Input(0, 0).telemetry;
  const stale = createGoldenR001Input(1, 0, { eventId: "gps:stale:M002", sequence: 2 }).telemetry;
  const historyOnly = createGoldenR001Input(2, 0, {
    eventId: "gps:replay:M003",
    sequence: 999,
    networkQuality: "offline-replay",
  }).telemetry;

  return {
    schemaVersion: 1,
    cases: [
      {
        caseId: "valid-golden",
        expectedContract: "valid",
        expectedIngestionStatus: "accepted",
        telemetry: validInput.telemetry,
        memberTelemetryInput,
        projectedLocation: validInput.projection,
        eventEnvelope,
        convoyGraph: split.graph,
        situation: split.situation,
        notificationRequest: split.notifications[0],
        liveSnapshot,
        convoySituationEvent,
        driverAlert,
        driverAlertAcknowledgement,
        realtimeEvent,
      },
      { caseId: "duplicate", expectedContract: "valid", expectedIngestionStatus: "duplicate", telemetry: duplicate },
      { caseId: "stale", expectedContract: "valid", expectedIngestionStatus: "stale-sequence", telemetry: stale },
      { caseId: "history-only", expectedContract: "valid", expectedIngestionStatus: "history-only", telemetry: historyOnly },
      {
        caseId: "invalid-version",
        expectedContract: "invalid",
        expectedIngestionStatus: "rejected",
        telemetry: { ...validInput.telemetry, schemaVersion: 2 },
      },
    ],
  };
}

async function createDart(schemas: ReturnType<typeof exportContractSchemas>): Promise<string> {
  const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());
  for (const { typeName, schema } of schemas) {
    await schemaInput.addSource({ name: typeName, schema: JSON.stringify(schema) });
  }
  const inputData = new InputData();
  inputData.addInput(schemaInput);
  const result = await quicktype({
    inputData,
    lang: "dart",
    rendererOptions: {
      "null-safety": "true",
      "final-props": "true",
    },
  });
  let generated = result.lines
    .join("\n")
    .replace(/^\/\/ To parse this JSON data[^\n]*\n(?:\/\/[^\n]*\n)*/m, "")
    .replace("import 'package:meta/meta.dart';\n", "");
  for (const contractName of [
    "LocationTelemetryV1",
    "MemberTelemetryInputV1",
    "EventEnvelopeV1",
    "ProjectedLocationV1",
    "LiveSnapshotV1",
    "ConvoySituationEventV1",
    "DriverAlertV1",
    "DriverAlertAcknowledgementV1",
    "RealtimeEventV1",
  ]) {
    const factory = new RegExp(
      `factory ${contractName}\\.fromJson\\(Map<String, dynamic> json\\) => ${contractName}\\(([\\s\\S]*?)\\n    \\);`,
    );
    generated = generated.replace(
      factory,
      `factory ${contractName}.fromJson(Map<String, dynamic> json) {\n` +
        `        _requireVersionOne(json, '${contractName}');\n` +
        `        return ${contractName}($1\n    );\n` +
        "    }",
    );
  }
  generated = generated.replace(
    "import 'dart:convert';",
    `import 'dart:convert';\n\nvoid _requireVersionOne(Map<String, dynamic> json, String contractName) {\n` +
      `  if (json['schemaVersion'] != 1) {\n` +
      `    throw FormatException('$contractName requires schemaVersion 1.');\n` +
      `  }\n` +
      `}`,
  );
  return `// GENERATED CODE - DO NOT MODIFY BY HAND.\n// Source: packages/contracts authoritative Zod schemas (schema version 1).\n\n${generated.trim()}\n`;
}

function publish(output: Output): void {
  if (checkOnly) {
    if (!existsSync(output.path) || readFileSync(output.path, "utf8") !== output.contents) {
      throw new Error(`Generated contract drift detected: ${output.path}`);
    }
    return;
  }
  mkdirSync(dirname(output.path), { recursive: true });
  writeFileSync(output.path, output.contents, "utf8");
}

const schemas = exportContractSchemas();
const outputs: Output[] = schemas.map(({ fileName, contents }) => ({
  path: resolve(generatedDirectory, fileName),
  contents,
}));
outputs.push({ path: resolve(generatedDirectory, "contract-examples-v1.json"), contents: stableJson(createExamples()) });
outputs.push({ path: dartOutputPath, contents: await createDart(schemas) });
outputs.forEach(publish);
