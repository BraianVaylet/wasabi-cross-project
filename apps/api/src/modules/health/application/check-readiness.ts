import type { DependencyProbe, ReadinessReport } from '../domain/readiness.ts';

/**
 * La instancia está lista sólo si todas sus dependencias responden. Una sola caída
 * alcanza para que el orquestador deje de enrutarle tráfico (docs/architecture.md).
 */
export async function checkReadiness(probes: readonly DependencyProbe[]): Promise<ReadinessReport> {
  const checks = await Promise.all(
    probes.map(async (probe) => ({ name: probe.name, ok: await probe.check() })),
  );

  return { ready: checks.every((check) => check.ok), checks };
}
