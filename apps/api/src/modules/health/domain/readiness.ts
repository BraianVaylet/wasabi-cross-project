/**
 * Puerto: qué necesita el módulo `health` para decidir si la instancia puede recibir
 * tráfico. No sabe que del otro lado hay un Mongo — eso lo resuelve infrastructure.
 */
export interface DependencyProbe {
  readonly name: string;
  check: () => Promise<boolean>;
}

export interface ReadinessReport {
  ready: boolean;
  checks: { name: string; ok: boolean }[];
}
