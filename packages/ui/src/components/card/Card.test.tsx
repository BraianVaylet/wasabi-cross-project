import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Card } from './Card.tsx';

describe('Card', () => {
  it('sin onClick es un contenedor, no un control', () => {
    render(<Card>Back SQ</Card>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Back SQ')).toBeInTheDocument();
  });

  it('con onClick se renderiza como button, así funciona con teclado', () => {
    render(<Card onClick={vi.fn()}>Back SQ</Card>);

    expect(screen.getByRole('button', { name: 'Back SQ' })).toBeInTheDocument();
  });

  it('la tarjeta clickeable responde a Enter', async () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Back SQ</Card>);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('highlighted marca la tarjeta destacada', () => {
    render(<Card highlighted>current</Card>);

    expect(screen.getByText('current')).toHaveClass('wc-card--highlighted');
  });

  it('acepta atributos extra del elemento', () => {
    render(<Card aria-label="ejercicio">Back SQ</Card>);

    expect(screen.getByLabelText('ejercicio')).toBeInTheDocument();
  });
});
