import { describe, expect, it } from 'vitest';
import { sessionUserSchema } from './session.api.ts';

describe('sessionUserSchema', () => {
  it('es lo que responde /me: quién es y su plan', () => {
    const user = { id: 'abc123', email: 'braian@example.com', name: 'Braian', plan: 'free' };

    expect(sessionUserSchema.parse(user)).toEqual(user);
  });

  it('rechaza un plan que no existe', () => {
    expect(
      sessionUserSchema.safeParse({ id: 'a', email: 'b@example.com', name: 'B', plan: 'gold' })
        .success,
    ).toBe(false);
  });
});
