import { DemoSessionV1Schema, type DemoSessionV1 } from './schema';

export const DEMO_SESSION_KEY = 'loopin:demo-session-v1';

export type SessionStorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readDemoSession(storage: SessionStorageAdapter): DemoSessionV1 | null {
  const raw = storage.getItem(DEMO_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = DemoSessionV1Schema.safeParse(JSON.parse(raw));
    if (parsed.success) return { ...parsed.data, isPlaying: false };
  } catch {
    // Invalid local demo data is discarded below.
  }
  storage.removeItem(DEMO_SESSION_KEY);
  return null;
}

export function writeDemoSession(storage: SessionStorageAdapter, session: DemoSessionV1): void {
  storage.setItem(DEMO_SESSION_KEY, JSON.stringify(DemoSessionV1Schema.parse(session)));
}

export function clearDemoSession(storage: SessionStorageAdapter): void {
  storage.removeItem(DEMO_SESSION_KEY);
}
