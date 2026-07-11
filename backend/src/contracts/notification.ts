import { z } from "zod";
import { Id } from "./common.js";

/** A high-priority push alert delivered via SNS → APNs/FCM. */
export const PushAlert = z.object({
  targetUserId: Id,
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(240),
  /** Free-form routing hints for the client (e.g. deep-link data). Never PII-heavy. */
  data: z.record(z.string()).default({}),
});
export type PushAlert = z.infer<typeof PushAlert>;
