import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  it('renderiza el nombre del producto', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Wasabi Cross' })).toBeInTheDocument();
  });

  it('arranca en tema oscuro (dark first)', () => {
    render(<App />);

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('el toggle del header cambia el tema de toda la app', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar a tema claro' }));

    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('usa los Componentes Cross, no HTML suelto', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'New Exercice' })).toHaveClass('wc-button');
    expect(screen.getByLabelText('Custom percentage')).toHaveClass('wc-text-field__input');
  });
});
