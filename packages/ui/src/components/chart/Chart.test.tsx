import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Chart } from './Chart.tsx';

/** La fila `index`, sin `as HTMLElement` ni `!`: el lint pelea con los dos. */
function fila(filas: HTMLElement[], index: number): HTMLElement {
  const found = filas[index];
  if (!found) {
    throw new Error(`No hay fila ${String(index)}: la tabla tiene ${String(filas.length)}`);
  }
  return found;
}

const SERIE = [
  { label: '10/01/2026', value: 100 },
  { label: '10/03/2026', value: 95 },
  { label: '10/06/2026', value: 120 },
];

describe('Chart', () => {
  it('se presenta con su título', () => {
    render(<Chart label="Evolución de Back squat" unit="kg" points={SERIE} />);

    expect(screen.getByRole('figure', { name: 'Evolución de Back squat' })).toBeInTheDocument();
  });

  it('los mismos datos están en una tabla, que es lo que lee un lector de pantalla', () => {
    render(<Chart label="Evolución de Back squat" unit="kg" points={SERIE} />);

    const tabla = screen.getByRole('table', { name: 'Evolución de Back squat' });
    const filas = within(tabla).getAllByRole('row').slice(1);

    expect(filas).toHaveLength(3);
    expect(within(fila(filas, 0)).getByText('10/01/2026')).toBeInTheDocument();
    expect(within(fila(filas, 0)).getByText('100 kg')).toBeInTheDocument();
    expect(within(fila(filas, 2)).getByText('120 kg')).toBeInTheDocument();
  });

  it('el dibujo no se lee dos veces: queda fuera del árbol de accesibilidad', () => {
    const { container } = render(<Chart label="Evolución" unit="kg" points={SERIE} />);

    expect(container.querySelector('.wc-chart__plot')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sin marcas lo dice, en vez de dibujar una línea inventada', () => {
    render(<Chart label="Evolución" unit="kg" points={[]} />);

    expect(screen.getByText('Todavía no hay marcas en este período')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('con una sola marca no rompe: la muestra igual', () => {
    render(<Chart label="Evolución" unit="kg" points={[{ label: '10/06/2026', value: 120 }]} />);

    const filas = within(screen.getByRole('table', { name: 'Evolución' }))
      .getAllByRole('row')
      .slice(1);

    expect(filas).toHaveLength(1);
  });

  it('la unidad viaja una vez por punto, no en el encabezado repetido', () => {
    render(<Chart label="Tiempo" unit="s" points={[{ label: '01/06/2026', value: 272 }]} />);

    expect(screen.getByText('272 s')).toBeInTheDocument();
  });
});
