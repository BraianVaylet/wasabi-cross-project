import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ColumnChart, type ColumnChartColumn } from './ColumnChart.tsx';

const MESES: ColumnChartColumn[] = [
  { key: '2026-07', label: 'jul', value: 2 },
  { key: '2026-08', label: 'ago', value: 0 },
  { key: '2026-09', label: 'sep', value: 3 },
];

function render3(columns = MESES) {
  return render(
    <ColumnChart label="Marcas por mes" columnLabel="Mes" valueLabel="Marcas" columns={columns} />,
  );
}

describe('ColumnChart', () => {
  it('se presenta con su título', () => {
    render3();

    expect(screen.getByRole('figure', { name: 'Marcas por mes' })).toBeInTheDocument();
  });

  it('los mismos números están en una tabla, el cero incluido', () => {
    render3();

    const tabla = screen.getByRole('table', { name: 'Marcas por mes' });
    const filas = within(tabla).getAllByRole('row').slice(1);

    expect(filas.map((fila) => fila.textContent)).toEqual(['jul2', 'ago0', 'sep3']);
    expect(within(tabla).getByRole('columnheader', { name: 'Mes' })).toBeInTheDocument();
    expect(within(tabla).getByRole('columnheader', { name: 'Marcas' })).toBeInTheDocument();
  });

  it('el dibujo no se lee dos veces ni se enfoca', async () => {
    const { container } = render3();

    await userEvent.tab();

    const plot = container.querySelector('.wc-chart__plot');
    expect(plot).toHaveAttribute('aria-hidden', 'true');
    expect(plot?.contains(document.activeElement)).toBe(false);
  });

  it('sin columnas lo dice', () => {
    render(
      <ColumnChart
        label="Marcas por mes"
        columnLabel="Mes"
        valueLabel="Marcas"
        columns={[]}
        emptyMessage="Sin marcas"
      />,
    );

    expect(screen.getByText('Sin marcas')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('todo en cero se dibuja igual: un período sin marcas es un dato', () => {
    render3(MESES.map((month) => ({ ...month, value: 0 })));

    expect(screen.getByRole('table', { name: 'Marcas por mes' })).toBeInTheDocument();
  });

  it('pasa axe sin violaciones', async () => {
    const { container } = render3();

    const results = await axe.run(container);

    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
