import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { AWS_REGION, requireEnv } from "../env.js";

/** Shared, connection-reused Document client (Lambda container scope). */
const base = new DynamoDBClient({ region: AWS_REGION });

export const ddb = DynamoDBDocumentClient.from(base, {
  marshallOptions: { removeUndefinedValues: true },
});

/** The single table name, injected by Terraform via env. */
export function tableName(): string {
  return requireEnv("TABLE_NAME");
}
