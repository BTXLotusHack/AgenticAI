import { randomUUID } from "node:crypto";

export type TascoAuthHeaders = {
  readonly authorization?: string;
  readonly apiKey?: string;
};

export type HeaderProvider = () => TascoAuthHeaders | Promise<TascoAuthHeaders>;

export type TascoClientHeaders = {
  readonly requestId: string;
  readonly locale: string;
  readonly timezone: string;
  readonly authorization?: string;
  readonly apiKey?: string;
};

export type ResolveHeadersInput = {
  readonly requestId?: string;
  readonly locale?: string;
  readonly timezone?: string;
  readonly bearerToken?: string;
  readonly apiKey?: string;
  readonly headerProvider?: HeaderProvider;
};

export async function resolveTascoHeaders(input: ResolveHeadersInput = {}): Promise<TascoClientHeaders> {
  const providerHeaders = input.headerProvider ? await input.headerProvider() : {};
  const bearerToken = input.bearerToken ?? providerHeaders.authorization?.replace(/^Bearer\s+/i, "");
  const apiKey = input.apiKey ?? providerHeaders.apiKey;
  return {
    requestId: input.requestId ?? randomUUID(),
    locale: input.locale ?? "vi-VN",
    timezone: input.timezone ?? "Asia/Ho_Chi_Minh",
    ...(bearerToken ? { authorization: `Bearer ${bearerToken}` } : {}),
    ...(apiKey ? { apiKey } : {}),
  };
}

export function applyTascoHeaders(initHeaders: HeadersInit | undefined, headers: TascoClientHeaders): Headers {
  const resolved = new Headers(initHeaders);
  resolved.set("X-Request-Id", headers.requestId);
  resolved.set("X-Locale", headers.locale);
  resolved.set("X-Timezone", headers.timezone);
  if (headers.authorization) resolved.set("Authorization", headers.authorization);
  if (headers.apiKey) resolved.set("X-API-Key", headers.apiKey);
  return resolved;
}
