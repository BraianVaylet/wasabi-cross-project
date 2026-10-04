/*
 * Lo que haría una persona frente a la pantalla del IdP falso, para los tests: abrir la URL de
 * autorización que le dio Better Auth, elegir quién entra y apretar "Entrar" (o "Cancelar").
 */

import { DEV_ADMIN } from './fake-idp.ts';

export interface Choice {
  /** `approve` entra, `deny` cancela. */
  action: 'approve' | 'deny';
  email?: string;
  name?: string;
  /** `false` destilda "Email verificado por el proveedor". Por defecto viene tildado. */
  emailVerified?: boolean;
  photo?: boolean;
  tenant?: 'consumers' | 'organization';
  accountId?: string;
}

/**
 * Abre `authorizeUrl`, lee los campos ocultos de la pantalla y manda el formulario como lo haría un
 * navegador. Devuelve la respuesta del IdP: un 302 al callback de la API, con `code` o con `error`.
 */
export async function chooseAtIdp(authorizeUrl: string, choice: Choice): Promise<Response> {
  const page = await fetch(authorizeUrl);
  if (page.status !== 200) throw new Error(`el IdP respondió ${String(page.status)} a la pantalla`);
  const html = await page.text();

  const fields: Record<string, string> = {
    email: choice.email ?? DEV_ADMIN.email,
    name: choice.name ?? DEV_ADMIN.name,
    action: choice.action,
  };
  for (const match of html.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"/g)) {
    fields[match[1] ?? ''] = (match[2] ?? '')
      .replaceAll('&quot;', '"')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&#39;', "'")
      .replaceAll('&amp;', '&');
  }
  // Como un navegador: las casillas tildadas viajan; las destildadas, no.
  if (choice.emailVerified !== false) fields.email_verified = 'on';
  if (choice.photo) fields.photo = 'on';
  if (choice.tenant) fields.tenant = choice.tenant;
  if (choice.accountId) fields.account_id = choice.accountId;

  return fetch(new URL(authorizeUrl).origin + new URL(authorizeUrl).pathname, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
}
