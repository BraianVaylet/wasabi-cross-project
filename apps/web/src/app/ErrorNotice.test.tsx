import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorNotice } from './ErrorNotice.tsx';

describe('ErrorNotice', () => {
  it('un error que no viene de la API no inventa código ni requestId', () => {
    render(<ErrorNotice error={new Error('referencia nula')} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Ocurrió un error inesperado.');
    expect(alert).not.toHaveTextContent('referencia nula');
    expect(alert).not.toHaveTextContent('Código');
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });
});
