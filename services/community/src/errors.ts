export class CommunityError extends Error {
  constructor(
    readonly code: "not-found" | "forbidden" | "conflict" | "invalid-request" | "unavailable",
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "CommunityError";
  }
}
