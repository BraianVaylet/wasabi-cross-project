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

  it('por default es la tarjeta lisa', () => {
    render(<Card>Back SQ</Card>);

    expect(screen.getByText('Back SQ')).toHaveClass('wc-card', 'wc-card--plain');
  });

  it('las dos variantes del historial: la marca actual y las anteriores', () => {
    const { rerender } = render(<Card variant="current">100 kg</Card>);
    expect(screen.getByText('100 kg')).toHaveClass('wc-card--current');

    rerender(<Card variant="past">80 kg</Card>);
    expect(screen.getByText('80 kg')).toHaveClass('wc-card--past');
    expect(screen.getByText('80 kg')).not.toHaveClass('wc-card--current');
  });

  it('la variante también vale cuando la tarjeta es un botón', () => {
    render(
      <Card variant="current" onClick={vi.fn()}>
        Back SQ
      </Card>,
    );

    expect(screen.getByRole('button', { name: 'Back SQ' })).toHaveClass(
      'wc-card--current',
      'wc-card--interactive',
    );
  });

  it('acepta atributos extra del elemento', () => {
    render(<Card aria-label="ejercicio">Back SQ</Card>);

    expect(screen.getByLabelText('ejercicio')).toBeInTheDocument();
  });
});
