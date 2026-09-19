import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isoDateTimeSchema, notFutureDateTimeSchema, timestampsSchema } from './datetime.ts';

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

describe('notFutureDateTimeSchema — la fecha de realización de una marca (spec §5.1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('acepta una fecha pasada y el momento actual', () => {
    expect(notFutureDateTimeSchema.safeParse('2026-06-23T10:00:00.000Z').success).toBe(true);
    expect(notFutureDateTimeSchema.safeParse('2026-09-18T12:00:00.000Z').success).toBe(true);
  });

  it('tolera unos minutos de reloj adelantado en el dispositivo', () => {
    expect(notFutureDateTimeSchema.safeParse('2026-09-18T12:04:59.000Z').success).toBe(true);
  });

  it('rechaza una fecha futura, con el motivo', () => {
    const manana = notFutureDateTimeSchema.safeParse('2026-09-19T12:00:00.000Z');
    const pasadoElMargen = notFutureDateTimeSchema.safeParse('2026-09-18T12:05:01.000Z');

    expect(manana.error?.issues[0]?.message).toBe('La fecha no puede ser futura');
    expect(pasadoElMargen.success).toBe(false);
  });

  it('compara el instante, no el texto: el offset cuenta', () => {
    // 10:00 en Buenos Aires son las 13:00 UTC: una hora en el futuro.
    expect(notFutureDateTimeSchema.safeParse('2026-09-18T10:00:00-03:00').success).toBe(false);
    expect(notFutureDateTimeSchema.safeParse('2026-09-18T08:00:00-03:00').success).toBe(true);
  });

  it('sigue exigiendo ISO 8601', () => {
    expect(notFutureDateTimeSchema.safeParse('18/09/2026').success).toBe(false);
  });
});
