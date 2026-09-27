import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('el dibujo no se puede enfocar: un foco escondido del lector de pantalla no sirve', async () => {
    const { container } = render(<Chart label="Evolución" unit="kg" points={SERIE} />);

    await userEvent.tab();

    const plot = container.querySelector('.wc-chart__plot');
    expect(plot?.contains(document.activeElement)).toBe(false);
    for (const element of plot?.querySelectorAll('[tabindex]') ?? []) {
      expect(element.getAttribute('tabindex')).toBe('-1');
    }
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

  it('el encabezado dice la unidad, como el "UNIDAD: KG" del diseño', () => {
    render(<Chart label="RM registrado" unit="kg" points={SERIE} />);

    expect(screen.getByText('Unidad: kg')).toBeInTheDocument();
    // El nombre del gráfico sigue siendo sólo su título, sin la unidad pegada.
    expect(screen.getByRole('figure', { name: 'RM registrado' })).toBeInTheDocument();
  });

  it('cada valor se escribe como diga la pantalla: un tiempo va en mm:ss', () => {
    render(
      <Chart
        label="Tiempo"
        unit="s"
        points={[{ label: '01/06/2026', value: 272 }]}
        formatValue={(value) => `${String(Math.floor(value / 60))}:${String(value % 60)}`}
      />,
    );

    const tabla = screen.getByRole('table', { name: 'Tiempo' });
    expect(within(tabla).getByText('4:32')).toBeInTheDocument();
  });

  it('con pocas marcas, cada punto lleva su valor escrito en el dibujo', () => {
    const { container } = render(<Chart label="RM registrado" unit="kg" points={SERIE} />);

    const dibujo = container.querySelector('.wc-chart__plot');
    expect(dibujo).toHaveTextContent('100 kg');
    expect(dibujo).toHaveTextContent('95 kg');
    expect(dibujo).toHaveTextContent('120 kg');
  });

  it('con muchas, sólo la última: doce etiquetas en un teléfono se pisan', () => {
    const anio = Array.from({ length: 12 }, (_, index) => ({
      label: `${String(index + 1).padStart(2, '0')}/01/2026`,
      value: 80 + index,
    }));
    const { container } = render(<Chart label="RM registrado" unit="kg" points={anio} />);

    const dibujo = container.querySelector('.wc-chart__plot');
    expect(dibujo).toHaveTextContent('91 kg');
    expect(dibujo).not.toHaveTextContent('80 kg');
    // La tabla, en cambio, las tiene todas.
    const tabla = screen.getByRole('table', { name: 'RM registrado' });
    expect(within(tabla).getAllByRole('row').slice(1)).toHaveLength(12);
  });

  it('la unidad viaja una vez por punto, no en el encabezado repetido', () => {
    render(<Chart label="Tiempo" unit="s" points={[{ label: '01/06/2026', value: 272 }]} />);

    const tabla = screen.getByRole('table', { name: 'Tiempo' });
    expect(within(tabla).getByText('272 s')).toBeInTheDocument();
  });
});
