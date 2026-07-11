import type { APIGatewayProxyResultV2 } from "aws-lambda";

const JSON_HEADERS = { "content-type": "application/json" } as const;

export function ok(body: unknown, statusCode = 200): APIGatewayProxyResultV2 {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

export function created(body: unknown): APIGatewayProxyResultV2 {
  return ok(body, 201);
}

export function error(
  statusCode: number,
  code: string,
  message: string,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify({ error: { code, message } }),
  };
}

/** Sentinel error carrying an HTTP status, thrown by handlers and mapped centrally. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
