import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton.tsx';

describe('IconButton', () => {
  it('el nombre accesible es el label; el ícono es decorativo', () => {
    render(
      <IconButton label="Abrir menú">
        <svg />
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Abrir menú' });
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('no manda formularios por accidente', () => {
    render(
      <IconButton label="Abrir menú">
        <svg />
      </IconButton>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('pasa los atributos del botón, como aria-expanded', async () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Abrir menú" aria-expanded={false} onClick={onClick}>
        <svg />
      </IconButton>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(onClick).toHaveBeenCalledOnce();
  });
});
