import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { Donut, type DonutSlice } from './Donut.tsx';

const CROSSFIT: DonutSlice = { key: 'crossfit', label: 'CrossFit', value: 4, percent: 50 };

const TRES: DonutSlice[] = [
  CROSSFIT,
  { key: 'hyrox', label: 'Hyrox', value: 2, percent: 25 },
  { key: 'musculacion', label: 'Musculación', value: 2, percent: 25 },
];

const OCHO: DonutSlice[] = [
  { key: 'a', label: 'A', value: 8, percent: 25 },
  { key: 'b', label: 'B', value: 6, percent: 19 },
  { key: 'c', label: 'C', value: 5, percent: 16 },
  { key: 'd', label: 'D', value: 4, percent: 13 },
  { key: 'e', label: 'E', value: 3, percent: 9 },
  { key: 'f', label: 'F', value: 2, percent: 6 },
  { key: 'g', label: 'G', value: 2, percent: 6 },
  { key: 'sin', label: 'Sin disciplina', value: 2, percent: 6, muted: true },
];

function leyenda(name = 'Disciplinas'): HTMLElement[] {
  return within(screen.getByRole('list', { name })).getAllByRole('listitem');
}

describe('Donut', () => {
  it('se presenta con su título', () => {
    render(
      <Donut label="Disciplinas" slices={TRES} total={{ value: '8', caption: 'menciones' }} />,
    );

    expect(screen.getByRole('figure', { name: 'Disciplinas' })).toBeInTheDocument();
  });

  it('la leyenda escribe cada porción con su valor y su porcentaje', () => {
    render(
      <Donut
        label="Disciplinas"
        slices={TRES}
        total={{ value: '8', caption: 'menciones' }}
        formatValue={(value) => `${String(value)} ej.`}
      />,
    );

    const items = leyenda();
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('CrossFit');
    expect(items[0]).toHaveTextContent('4 ej.');
    expect(items[0]).toHaveTextContent('50%');
  });

  it('el total va escrito en el centro', () => {
    render(
      <Donut label="Disciplinas" slices={TRES} total={{ value: '8', caption: 'menciones' }} />,
    );

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('menciones')).toBeInTheDocument();
  });

  it('el dibujo no se lee dos veces ni se enfoca', async () => {
    const { container } = render(
      <Donut label="Disciplinas" slices={TRES} total={{ value: '8', caption: 'menciones' }} />,
    );

    await userEvent.tab();

    const plot = container.querySelector('.wc-donut__plot');
    expect(plot).toHaveAttribute('aria-hidden', 'true');
    expect(plot?.contains(document.activeElement)).toBe(false);
  });

  it('los colores van en el orden de la paleta, sin saltear', () => {
    const { container } = render(
      <Donut label="Disciplinas" slices={TRES} total={{ value: '8', caption: 'menciones' }} />,
    );

    const colores = [...container.querySelectorAll<HTMLElement>('.wc-donut__swatch')].map(
      (swatch) => swatch.style.backgroundColor,
    );
    expect(colores).toEqual(['var(--wc-chart-1)', 'var(--wc-chart-2)', 'var(--wc-chart-3)']);
  });

  it('una porción gris va al final y no gasta un color de la paleta', () => {
    const { container } = render(
      <Donut
        label="Disciplinas"
        slices={[
          { key: 'sin', label: 'Sin disciplina', value: 1, percent: 50, muted: true },
          CROSSFIT,
        ]}
        total={{ value: '2', caption: 'menciones' }}
      />,
    );

    const [primera, segunda] = leyenda();
    expect(primera).toHaveTextContent('CrossFit');
    expect(segunda).toHaveTextContent('Sin disciplina');
    const colores = [...container.querySelectorAll<HTMLElement>('.wc-donut__swatch')].map(
      (swatch) => swatch.style.backgroundColor,
    );
    expect(colores).toEqual(['var(--wc-chart-1)', 'var(--wc-chart-other)']);
  });

  it('con más de seis porciones, cinco y "Otras", que dice cuáles junta', () => {
    render(
      <Donut label="Disciplinas" slices={OCHO} total={{ value: '32', caption: 'menciones' }} />,
    );

    const items = leyenda();
    expect(items).toHaveLength(6);
    const otras = items[5];
    expect(otras).toHaveTextContent('Otras');
    expect(otras).toHaveTextContent('F, G, Sin disciplina');
    // Suma lo que junta: 2 + 2 + 2 y 6 + 6 + 6.
    expect(otras).toHaveTextContent('6');
    expect(otras).toHaveTextContent('18%');
  });

  it('con seis porciones no junta nada', () => {
    render(
      <Donut
        label="Disciplinas"
        slices={OCHO.slice(0, 6)}
        total={{ value: '28', caption: 'menciones' }}
        otherLabel="Resto"
      />,
    );

    expect(leyenda()).toHaveLength(6);
    expect(screen.queryByText('Resto')).not.toBeInTheDocument();
  });

  it('sin porciones lo dice, en vez de dibujar un anillo vacío', () => {
    render(
      <Donut
        label="Disciplinas"
        slices={[]}
        total={{ value: '0', caption: 'menciones' }}
        emptyMessage="Sin ejercicios"
      />,
    );

    expect(screen.getByText('Sin ejercicios')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('pasa axe sin violaciones, también con "Otras"', async () => {
    const { container } = render(
      <Donut label="Disciplinas" slices={OCHO} total={{ value: '32', caption: 'menciones' }} />,
    );

    const results = await axe.run(container);

    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
