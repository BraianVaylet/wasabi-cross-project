import { describe, expect, it } from 'vitest';
import { isoDateTimeSchema, timestampsSchema } from './datetime.ts';

describe('isoDateTimeSchema', () => {
  it('acepta ISO 8601 en UTC', () => {
    expect(isoDateTimeSchema.parse('2026-09-17T14:03:11.412Z')).toBe('2026-09-17T14:03:11.412Z');
  });

  it('acepta ISO 8601 con offset explícito', () => {
    expect(isoDateTimeSchema.safeParse('2026-09-17T11:03:11-03:00').success).toBe(true);
  });

  it('rechaza una fecha sin hora', () => {
    expect(isoDateTimeSchema.safeParse('2026-09-17').success).toBe(false);
  });

  it('rechaza un formato local ambiguo', () => {
    expect(isoDateTimeSchema.safeParse('17/09/2026 14:03').success).toBe(false);
  });
});

describe('timestampsSchema', () => {
  it('exige createdAt y updatedAt', () => {
    expect(
      timestampsSchema.safeParse({
        createdAt: '2026-09-17T14:03:11.412Z',
        updatedAt: '2026-09-17T14:03:11.412Z',
      }).success,
    ).toBe(true);
    expect(timestampsSchema.safeParse({ createdAt: '2026-09-17T14:03:11.412Z' }).success).toBe(
      false,
    );
  });
});
