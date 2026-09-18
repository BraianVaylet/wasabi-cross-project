# ADR-0006: Reglas de dominio compartidas viven en @wasabi-cross/schemas

- Fecha: 2026-09-18
- Estado: aceptada

## Contexto

El cálculo de porcentajes (spec §5.1) lo necesitan el back y el front. El front, en particular,
para el porcentaje custom: el resultado tiene que actualizarse mientras el usuario tipea, sin ir a
la API. Si cada lado tuviera su copia, tarde o temprano calcularían distinto, y CLAUDE.md prohíbe
duplicar reglas entre front y back.

Hay que decidir dónde vive la lógica de dominio pura que comparten los dos.

## Opciones consideradas

1. **En `@wasabi-cross/schemas`.** Ya aloja reglas de dominio compartidas, no sólo validaciones:
   `measureKindFor` (qué mide cada categoría) y `PLAN_LIMITS`.
2. **Un paquete nuevo, `@wasabi-cross/domain`.** Separa "validar" de "calcular", a cambio de un
   workspace más: su build, sus tests, su lugar en CI y en el orden de compilación.
3. **Duplicar en front y back.** Descartada de entrada.

## Decisión

Opción 1. Hoy son cuatro funciones puras, y el paquete ya tiene reglas de la misma naturaleza. Un
paquete nuevo para eso es YAGNI (spec §8). Van en `packages/schemas/src/calc/`, separadas de los
schemas de validación.

**Qué entra ahí:** funciones puras, sin I/O ni dependencias de framework, que front y back
necesitan calcular igual. **Qué no:** casos de uso, acceso a datos o cualquier cosa que sólo usa uno
de los dos lados; eso va en el módulo de la API o en la app web.

## Consecuencias

- El nombre del paquete queda más angosto que su contenido. Es un costo de nombre, no de diseño.
- **Disparador para revisar:** si las reglas compartidas crecen al punto de que `calc/` deja de ser
  una carpeta chica, o si aparece lógica compartida que necesita dependencias que schemas no debería
  tener, se separa en `@wasabi-cross/domain`.
