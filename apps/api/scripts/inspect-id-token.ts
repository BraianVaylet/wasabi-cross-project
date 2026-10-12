import {
  describeIdToken,
  formatIdTokenReport,
} from '../src/modules/oauth/domain/id-token-report.ts';

/**
 * Qué trae un ID token de Microsoft y qué haría la API con él (F9-10):
 *
 *   pnpm --filter @wasabi-cross/api oauth:inspect-token
 *
 * El token se pega por la entrada estándar (no por argumento, para que no quede en el historial del
 * shell) y se cierra con Ctrl+D (en Windows, Ctrl+Z y Enter). También anda por una tubería. Imprime
 * los nombres de los claims y respuestas de sí o no: **nunca** el email, el nombre ni los ids. Lo que
 * sale se puede pegar en la bitácora de la prueba; el token, no. Está explicado en
 * `docs/runbooks/oauth.md`.
 *
 * Con `MICROSOFT_CLIENT_ID` en el entorno (el `.env` se lee solo) también dice si la audiencia es la
 * del cliente de Wasabi. No verifica la firma: sólo lee lo que el token dice (igual que la API en el
 * flujo con `code`, donde lo autentica el TLS contra el endpoint de Microsoft).
 *
 * Códigos de salida: 0 la cuenta se crearía; 2 el token se lee pero la API no la crearía; 1 no es un
 * ID token.
 */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'Este script no corre con NODE_ENV=production: es para probar en dev y en staging.',
    );
    process.exit(1);
  }

  if (process.stdin.isTTY) {
    console.error(
      'Pegá el ID token y cerrá la entrada: Ctrl+D (en Windows, Ctrl+Z y Enter). No se muestra.',
    );
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const authority = process.env.MICROSOFT_AUTHORITY;
  const report = describeIdToken(await readStdin(), {
    ...(clientId ? { clientId } : {}),
    ...(authority ? { authority } : {}),
  });

  console.info(formatIdTokenReport(report));
  process.exit(!report.decodable ? 1 : report.emailVerified.verified ? 0 : 2);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
