import { describe, expect, it } from 'vitest';
import { sessionUserSchema } from './session.api.ts';

describe('sessionUserSchema', () => {
  const user = {
    id: 'abc123',
    email: 'braian@example.com',
    name: 'Braian',
    plan: 'free',
    hasPhoto: false,
  };

  it('es lo que responde /me: quién es, su plan y si tiene foto', () => {
    expect(sessionUserSchema.parse(user)).toEqual(user);
    expect(sessionUserSchema.parse({ ...user, hasPhoto: true }).hasPhoto).toBe(true);
  });

  it('rechaza un plan que no existe', () => {
    expect(sessionUserSchema.safeParse({ ...user, plan: 'gold' }).success).toBe(false);
  });

  it('hasPhoto es obligatorio y es un booleano: la foto misma nunca viaja por acá', () => {
    expect(sessionUserSchema.safeParse({ ...user, hasPhoto: undefined }).success).toBe(false);
    expect(
      sessionUserSchema.safeParse({ ...user, hasPhoto: 'data:image/png;base64,AAAA' }).success,
    ).toBe(false);
  });

  it('una URL de foto de más no se cuela en lo que parsea', () => {
    const parsed = sessionUserSchema.parse({
      ...user,
      image: 'https://lh3.googleusercontent.com/a',
    });

    expect(parsed).not.toHaveProperty('image');
  });
});
