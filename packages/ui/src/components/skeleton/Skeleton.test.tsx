import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton.tsx';

describe('Skeleton', () => {
  it('anuncia que está cargando una sola vez, no una por pieza', () => {
    render(<Skeleton label="Cargando tus ejercicios" count={3} />);

    const status = screen.getByRole('status');
    expect(status).toHaveAccessibleName('Cargando tus ejercicios');
    expect(status.querySelectorAll('.wc-skeleton__piece')).toHaveLength(3);
  });

  it('las piezas son decorativas: el lector no lee tres veces lo mismo', () => {
    render(<Skeleton label="Cargando" count={2} />);

    for (const piece of screen.getByRole('status').querySelectorAll('.wc-skeleton__piece')) {
      expect(piece).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('por defecto muestra una pieza', () => {
    render(<Skeleton label="Cargando" />);

    expect(screen.getByRole('status').querySelectorAll('.wc-skeleton__piece')).toHaveLength(1);
  });
});
