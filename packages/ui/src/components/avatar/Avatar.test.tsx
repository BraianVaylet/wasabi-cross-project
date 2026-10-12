import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, initialsOf } from './Avatar.tsx';

describe('initialsOf', () => {
  it.each([
    ['Braian', 'B'],
    ['braian', 'B'],
    ['Ana María', 'AM'],
    ['  juan   pérez  ', 'JP'],
    ['Ana María García', 'AM'],
    ['Ñandú', 'Ñ'],
    ['Zoë', 'Z'],
    ['🏋️ Pablo', '🏋P'],
    ['x', 'X'],
  ])('%j → %s', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });

  it.each(['', '   ', '\n'])('un nombre vacío (%j) no rompe: da un signo de pregunta', (name) => {
    expect(initialsOf(name)).toBe('?');
  });
});

/** La foto que se está mostrando, o un error que se entienda si no hay (`as` y `!` se pelean en el lint). */
function photoIn(container: HTMLElement): HTMLImageElement {
  const image = container.querySelector('img');
  if (!image) {
    throw new Error('No hay una foto a la vista');
  }
  return image;
}

describe('Avatar', () => {
  it('sin foto muestra las iniciales, decorativas: el nombre va al lado', () => {
    const { container } = render(<Avatar name="Ana María" />);

    const initials = screen.getByText('AM');
    expect(initials).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('img')).toBeNull();
  });

  it('con foto muestra la imagen, sin alt: el nombre ya está escrito al lado', () => {
    const { container } = render(<Avatar name="Ana" src="/api/v1/me/photo" />);

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', '/api/v1/me/photo');
    expect(image).toHaveAttribute('alt', '');
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });

  it('la foto no manda el referrer: no le cuenta al servidor desde dónde se mira', () => {
    const { container } = render(<Avatar name="Ana" src="/api/v1/me/photo" />);

    expect(container.querySelector('img')).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('si la foto falla al cargar, cae a las iniciales y no deja un ícono roto', () => {
    const { container } = render(<Avatar name="Ana María" src="/api/v1/me/photo" />);

    fireEvent.error(photoIn(container));

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AM')).toBeInTheDocument();
  });

  it('una foto nueva después de una que falló se vuelve a intentar', () => {
    const { container, rerender } = render(<Avatar name="Ana" src="/uno.png" />);
    fireEvent.error(photoIn(container));
    expect(container.querySelector('img')).toBeNull();

    rerender(<Avatar name="Ana" src="/dos.png" />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/dos.png');
  });

  it('una foto vacía o sin definir es lo mismo que no tener', () => {
    const { container, rerender } = render(<Avatar name="Ana" src="" />);
    expect(container.querySelector('img')).toBeNull();

    rerender(<Avatar name="Ana" src={undefined} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('tiene tamaños: mediano por defecto y grande para el Perfil', () => {
    const { container, rerender } = render(<Avatar name="Ana" />);
    expect(container.firstChild).toHaveClass('wc-avatar', 'wc-avatar--md');

    rerender(<Avatar name="Ana" size="lg" />);
    expect(container.firstChild).toHaveClass('wc-avatar--lg');
  });

  it('conserva las clases que le den', () => {
    const { container } = render(<Avatar name="Ana" className="mia" />);

    expect(container.firstChild).toHaveClass('wc-avatar', 'mia');
  });
});
