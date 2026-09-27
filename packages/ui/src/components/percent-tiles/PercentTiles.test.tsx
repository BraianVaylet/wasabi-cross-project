import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PercentTiles, type PercentTileOption } from './PercentTiles.tsx';

const options: PercentTileOption[] = [
  { value: 65, label: '65%', detail: '65 kg' },
  { value: 75, label: '75%', detail: '75 kg' },
  { value: 80, label: '80%', detail: '80 kg' },
];

function renderTiles(value: number | undefined, onChange = vi.fn()) {
  render(
    <PercentTiles
      legend="Porcentaje del RM"
      name="porcentaje"
      options={options}
      value={value}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe('PercentTiles', () => {
  it('es un grupo con nombre: el lector lo anuncia antes de las opciones', () => {
    renderTiles(65);

    expect(screen.getByRole('group', { name: 'Porcentaje del RM' })).toBeInTheDocument();
  });

  it('cada casillero es un radio real que dice porcentaje y carga juntos', () => {
    renderTiles(65);

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: '75% · 75 kg' })).toBeInTheDocument();
  });

  it('marca el elegido', () => {
    renderTiles(80);

    expect(screen.getByRole('radio', { name: '80% · 80 kg' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '65% · 65 kg' })).not.toBeChecked();
  });

  it('un valor que no está en la grilla no marca ninguno', () => {
    renderTiles(98);

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked();
    }
  });

  it('tocar el casillero lo elige', async () => {
    const onChange = renderTiles(65);

    await userEvent.click(screen.getByText('75 kg'));

    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('con las flechas se cambia de casillero, como en cualquier grupo de radios', async () => {
    const onChange = renderTiles(65);

    await userEvent.tab();
    expect(screen.getByRole('radio', { name: '65% · 65 kg' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith(75);
  });
});
