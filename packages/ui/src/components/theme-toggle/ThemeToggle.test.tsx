import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle.tsx';

describe('ThemeToggle', () => {
  it('en oscuro, anuncia que cambia a claro', () => {
    render(<ThemeToggle theme="dark" onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Cambiar a tema claro' })).toBeInTheDocument();
  });

  it('en claro, anuncia que cambia a oscuro', () => {
    render(<ThemeToggle theme="light" onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Cambiar a tema oscuro' })).toBeInTheDocument();
  });

  it('el ícono es decorativo: el nombre accesible viene del aria-label', () => {
    render(<ThemeToggle theme="dark" onToggle={vi.fn()} />);

    expect(screen.getByRole('button').querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('avisa al togglear', async () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="dark" onToggle={onToggle} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
