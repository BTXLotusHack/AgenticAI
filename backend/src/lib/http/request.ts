import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import { z } from "zod";
import { CallerIdentity } from "../../contracts/common.js";
import { HttpError } from "./response.js";

/**
 * Extract the authenticated caller from the API Gateway HTTP API JWT authorizer.
 *
 * The authorizer is a Cognito user pool; API Gateway has already verified the
 * token signature, issuer and expiry before invoking this Lambda. We only read
 * the resulting claims — we never trust an unverified token here.
 */
export function getCaller(event: APIGatewayProxyEventV2WithJWTAuthorizer): CallerIdentity {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  const sub = claims?.["sub"];
  if (typeof sub !== "string" || sub.length === 0) {
    throw new HttpError(401, "unauthenticated", "Missing verified caller identity.");
  }
  const emailClaim = claims["email"];
  return CallerIdentity.parse({
    userId: sub,
    email: typeof emailClaim === "string" ? emailClaim : undefined,
  });
}

/** Parse and validate a JSON body against a schema, mapping failures to 400. */
export function parseBody<T>(event: APIGatewayProxyEventV2, schema: z.ZodType<T>): T {
  let raw: unknown;
  try {
    raw = event.body ? JSON.parse(event.body) : {};
  } catch {
    throw new HttpError(400, "invalid_json", "Request body is not valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(400, "validation_failed", result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}

/** Read a required path parameter. */
export function pathParam(event: APIGatewayProxyEventV2, name: string): string {
  const value = event.pathParameters?.[name];
  if (value === undefined || value === "") {
    throw new HttpError(400, "missing_path_param", `Missing path parameter: ${name}`);
  }
  return value;
}
