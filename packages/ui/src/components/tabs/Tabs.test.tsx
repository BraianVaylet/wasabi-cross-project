import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs.tsx';

const PESTAÑAS = [
  { value: 'catalogo', label: 'Catálogo' },
  { value: 'crear', label: 'Crear' },
  { value: 'otra', label: 'Otra' },
] as const;

type Pestaña = (typeof PESTAÑAS)[number]['value'];

/** Como la usa una pantalla: el valor vive afuera (en la URL, en el caso real). */
function Controlada({ inicial = 'catalogo' }: { inicial?: Pestaña }): React.JSX.Element {
  const [value, setValue] = useState<Pestaña>(inicial);

  return (
    <Tabs label="Cómo agregar" tabs={PESTAÑAS} value={value} onChange={setValue}>
      <p>Panel de {value}</p>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('es una lista de pestañas con nombre, y el panel se llama como la pestaña activa', () => {
    render(<Controlada />);

    expect(screen.getByRole('tablist', { name: 'Cómo agregar' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Catálogo' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Crear' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: 'Catálogo' })).toHaveTextContent(
      'Panel de catalogo',
    );
  });

  it('cada pestaña controla el panel', () => {
    render(<Controlada />);

    const panel = screen.getByRole('tabpanel');
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveAttribute('aria-controls', panel.id);
    }
  });

  it('un clic activa la pestaña y cambia el panel', async () => {
    render(<Controlada />);

    await userEvent.click(screen.getByRole('tab', { name: 'Crear' }));

    expect(screen.getByRole('tab', { name: 'Crear' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Crear' })).toHaveTextContent('Panel de crear');
  });

  it('sólo la pestaña activa está en el orden de foco', async () => {
    render(
      <>
        <button type="button">Antes</button>
        <Controlada inicial="crear" />
      </>,
    );

    screen.getByRole('button', { name: 'Antes' }).focus();
    await userEvent.tab();

    expect(screen.getByRole('tab', { name: 'Crear' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Catálogo' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tab', { name: 'Otra' })).toHaveAttribute('tabindex', '-1');
  });

  it('las flechas mueven el foco, y dan la vuelta en los extremos', async () => {
    render(<Controlada />);
    screen.getByRole('tab', { name: 'Catálogo' }).focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Crear' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Catálogo' })).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Otra' })).toHaveFocus();
  });

  it('Home y End van a la primera y a la última', async () => {
    render(<Controlada inicial="crear" />);
    screen.getByRole('tab', { name: 'Crear' }).focus();

    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Otra' })).toHaveFocus();

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Catálogo' })).toHaveFocus();
  });

  it('mover el foco no activa: se activa con Enter o Espacio', async () => {
    const onChange = vi.fn();
    render(
      <Tabs label="Cómo agregar" tabs={PESTAÑAS} value="catalogo" onChange={onChange}>
        <p>Panel</p>
      </Tabs>,
    );
    screen.getByRole('tab', { name: 'Catálogo' }).focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('crear');

    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith('otra');
  });

  it('activar la que ya está activa no avisa nada', async () => {
    const onChange = vi.fn();
    render(
      <Tabs label="Cómo agregar" tabs={PESTAÑAS} value="catalogo" onChange={onChange}>
        <p>Panel</p>
      </Tabs>,
    );

    await userEvent.click(screen.getByRole('tab', { name: 'Catálogo' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('pasa axe sin violaciones', async () => {
    const { container } = render(<Controlada />);

    const results = await axe.run(container);

    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
