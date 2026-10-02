import { render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { RankBars, type RankBarRow } from './RankBars.tsx';

const FILAS: RankBarRow[] = [
  {
    key: 'cuadriceps',
    label: 'Cuádriceps',
    strong: 2,
    soft: 1,
    valueText: '50%',
    description: '2 como primario y 2 como secundario',
  },
  { key: 'gluteo', label: 'Glúteo', strong: 0, soft: 1.5, valueText: '30%' },
  { key: 'pectoral', label: 'Pectoral', strong: 1, soft: 0, valueText: '20%' },
];

const LEYENDA = { strong: 'Primario', soft: 'Secundario' };

function barras(container: HTMLElement, fila: number): string[] {
  const row = container.querySelectorAll('.wc-rank-bars__row')[fila];
  return [...(row?.querySelectorAll<HTMLElement>('.wc-rank-bars__bar') ?? [])].map(
    (bar) =>
      `${bar.className.replace('wc-rank-bars__bar wc-rank-bars__bar--', '')} ${bar.style.width}`,
  );
}

describe('RankBars', () => {
  it('lista las filas en orden, con su nombre y su número', () => {
    render(<RankBars label="Grupos musculares" rows={FILAS} legend={LEYENDA} />);

    const items = within(screen.getByRole('list', { name: 'Grupos musculares' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Cuádriceps');
    expect(items[0]).toHaveTextContent('50%');
    expect(items[2]).toHaveTextContent('Pectoral');
  });

  it('el largo es proporcional a la fila más grande, tramo por tramo', () => {
    const { container } = render(
      <RankBars label="Grupos musculares" rows={FILAS} legend={LEYENDA} />,
    );

    // La más grande suma 3: su lleno es 2/3 y su claro 1/3.
    expect(barras(container, 0)).toEqual(['strong 66.66666666666666%', 'soft 33.33333333333333%']);
  });

  it('un tramo en cero no se dibuja', () => {
    const { container } = render(
      <RankBars label="Grupos musculares" rows={FILAS} legend={LEYENDA} />,
    );

    expect(barras(container, 1)).toEqual(['soft 50%']);
    expect(barras(container, 2)).toEqual(['strong 33.33333333333333%']);
  });

  it('el dibujo no se lee; el detalle de los tramos sí, para el lector de pantalla', () => {
    const { container } = render(
      <RankBars label="Grupos musculares" rows={FILAS} legend={LEYENDA} />,
    );

    for (const track of container.querySelectorAll('.wc-rank-bars__track')) {
      expect(track).toHaveAttribute('aria-hidden', 'true');
    }
    expect(screen.getByText(': 2 como primario y 2 como secundario')).toBeInTheDocument();
  });

  it('la leyenda dice qué es cada tramo', () => {
    render(<RankBars label="Grupos musculares" rows={FILAS} legend={LEYENDA} />);

    expect(screen.getByText('Primario')).toBeInTheDocument();
    expect(screen.getByText('Secundario')).toBeInTheDocument();
  });

  it('sin filas lo dice', () => {
    render(
      <RankBars label="Grupos musculares" rows={[]} legend={LEYENDA} emptyMessage="Nada todavía" />,
    );

    expect(screen.getByText('Nada todavía')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('pasa axe sin violaciones', async () => {
    const { container } = render(
      <RankBars label="Grupos musculares" rows={FILAS} legend={LEYENDA} />,
    );

    const results = await axe.run(container);

    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
