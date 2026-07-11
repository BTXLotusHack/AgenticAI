import { describe, expect, it } from 'vitest';

import { appendAuditEntry } from './audit';
import { createInitialDemoSession } from './schema';
import { DEMO_SESSION_KEY, clearDemoSession, readDemoSession, writeDemoSession } from './storage';

class MemoryStorage {
  readonly values = new Map<string, string>();
  readonly removed: string[] = [];

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
    this.removed.push(key);
  }
}

describe('demo session storage', () => {
  it('round-trips a valid version-one session and restores it paused', () => {
    const storage = new MemoryStorage();
    const session = { ...createInitialDemoSession(), frameIndex: 4, isPlaying: false as const };

    writeDemoSession(storage, session);

    expect(readDemoSession(storage)).toEqual(session);
  });

  it.each([
    ['malformed JSON', '{broken'],
    ['incompatible version', JSON.stringify({ ...createInitialDemoSession(), schemaVersion: 2 })],
  ])('removes %s instead of crashing', (_label, value) => {
    const storage = new MemoryStorage();
    storage.setItem(DEMO_SESSION_KEY, value);

    expect(readDemoSession(storage)).toBeNull();
    expect(storage.removed).toContain(DEMO_SESSION_KEY);
  });

  it('clears the versioned key', () => {
    const storage = new MemoryStorage();
    writeDemoSession(storage, createInitialDemoSession());
    clearDemoSession(storage);
    expect(storage.getItem(DEMO_SESSION_KEY)).toBeNull();
  });

  it('appends an immutable whitelisted audit fact without precise coordinates', () => {
    const session = createInitialDemoSession();
    const next = appendAuditEntry(session, {
      eventType: 'DemoTripStarted',
      occurredAt: '2026-07-20T00:00:00.000Z',
      frameIndex: 0,
      latitude: 21.0285,
      longitude: 105.8542,
    } as never);

    expect(session.auditEntries).toEqual([]);
    expect(next.auditEntries).toHaveLength(1);
    expect(next.auditEntries[0]).toEqual({
      eventId: 'DemoTripStarted:2026-07-20T00:00:00.000Z:0',
      eventType: 'DemoTripStarted',
      occurredAt: '2026-07-20T00:00:00.000Z',
      tripId: 'TRIP001',
      frameIndex: 0,
    });
    expect(JSON.stringify(next.auditEntries)).not.toMatch(/latitude|longitude|21\.0285|105\.8542/);
  });
});
