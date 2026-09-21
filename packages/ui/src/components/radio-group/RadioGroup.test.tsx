import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RadioGroup } from './RadioGroup.tsx';

const CATEGORIAS = [
  { value: 'fuerza', label: 'Fuerza (RM)' },
  { value: 'gimnastico', label: 'Gimnástico (reps)' },
  { value: 'running', label: 'Running (tiempo)' },
];

describe('RadioGroup', () => {
  it('es un grupo con nombre, no radios sueltas', () => {
    render(
      <RadioGroup legend="Categoría" name="categoria" options={CATEGORIAS} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('group', { name: 'Categoría' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marca la opción elegida y avisa el cambio', async () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        legend="Categoría"
        name="categoria"
        options={CATEGORIAS}
        value="fuerza"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Fuerza (RM)' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: 'Running (tiempo)' }));

    expect(onChange).toHaveBeenCalledWith('running');
  });

  it('se recorre con las flechas del teclado, como manda el patrón de radios', async () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        legend="Categoría"
        name="categoria"
        options={CATEGORIAS}
        value="fuerza"
        onChange={onChange}
      />,
    );

    screen.getByRole('radio', { name: 'Fuerza (RM)' }).focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(onChange).toHaveBeenCalledWith('gimnastico');
  });

  it('con error, lo anuncia una vez para todo el grupo', () => {
    render(
      <RadioGroup
        legend="Categoría"
        name="categoria"
        options={CATEGORIAS}
        onChange={vi.fn()}
        error="Elegí una categoría"
      />,
    );

    expect(screen.getByRole('group')).toHaveAccessibleDescription('Elegí una categoría');
    expect(screen.getByRole('alert')).toHaveTextContent('Elegí una categoría');
  });
});
