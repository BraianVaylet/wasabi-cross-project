import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CheckboxGroup } from './CheckboxGroup.tsx';

const OPCIONES = [
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'resistencia', label: 'Resistencia' },
  { value: 'velocidad', label: 'Velocidad' },
] as const;

function renderGrupo(values: string[] = [], onChange = vi.fn()) {
  render(
    <CheckboxGroup legend="Capacidades" options={OPCIONES} values={values} onChange={onChange} />,
  );
  return onChange;
}

describe('CheckboxGroup', () => {
  it('es un grupo con nombre, no tres casillas sueltas', () => {
    renderGrupo();

    expect(screen.getByRole('group', { name: 'Capacidades' })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('marca lo elegido', () => {
    renderGrupo(['resistencia']);

    expect(screen.getByRole('checkbox', { name: 'Resistencia' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Fuerza' })).not.toBeChecked();
  });

  it('avisa lo que queda elegido al sumar una', async () => {
    const onChange = renderGrupo(['fuerza']);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Velocidad' }));

    expect(onChange).toHaveBeenCalledWith(['fuerza', 'velocidad']);
  });

  it('y al quitarla', async () => {
    const onChange = renderGrupo(['fuerza', 'velocidad']);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Fuerza' }));

    expect(onChange).toHaveBeenCalledWith(['velocidad']);
  });

  it('se recorre y se elige con el teclado', async () => {
    const onChange = renderGrupo();

    await userEvent.tab();
    await userEvent.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith(['fuerza']);
  });

  it('el error se anuncia y marca el grupo como inválido', () => {
    render(
      <CheckboxGroup
        legend="Capacidades"
        options={OPCIONES}
        values={[]}
        onChange={vi.fn()}
        error="Elegí al menos una"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Elegí al menos una');
    expect(screen.getByRole('group', { name: /Capacidades/ })).toHaveAccessibleDescription(
      'Elegí al menos una',
    );
  });
});
