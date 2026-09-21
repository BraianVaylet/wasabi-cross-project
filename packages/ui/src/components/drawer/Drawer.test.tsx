import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer.tsx';

/** Un botón que abre el menú, como el del header, y el menú con tres opciones. */
function Harness({ onClose }: { onClose?: () => void }): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Abrir menú
      </button>
      <a href="#afuera">Afuera</a>
      <Drawer
        open={open}
        label="Menú principal"
        closeLabel="Cerrar menú"
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
      >
        <a href="#uno">Uno</a>
        <a href="#dos">Dos</a>
        <button type="button">Salir</button>
      </Drawer>
    </>
  );
}

async function openWithKeyboard(): Promise<void> {
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveFocus();
  await userEvent.keyboard('{Enter}');
}

describe('Drawer', () => {
  it('cerrado no renderiza nada', () => {
    render(<Harness />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto es un diálogo modal con nombre', async () => {
    render(<Harness />);

    await openWithKeyboard();

    const dialog = screen.getByRole('dialog', { name: 'Menú principal' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('al abrirse con teclado, el foco entra al menú', async () => {
    render(<Harness />);

    await openWithKeyboard();

    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });

  it('Tab desde el último vuelve al primero: el foco queda atrapado adentro', async () => {
    render(<Harness />);
    await openWithKeyboard();

    screen.getByRole('button', { name: 'Salir' }).focus();
    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveFocus();
  });

  it('Shift+Tab desde el primero va al último', async () => {
    render(<Harness />);
    await openWithKeyboard();

    screen.getByRole('button', { name: 'Cerrar menú' }).focus();
    await userEvent.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Salir' })).toHaveFocus();
  });

  it('recorriendo con Tab nunca sale del menú', async () => {
    render(<Harness />);
    await openWithKeyboard();
    const dialog = screen.getByRole('dialog');

    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('Escape lo cierra y el foco vuelve al botón que lo abrió', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await openWithKeyboard();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveFocus();
  });

  it('el botón de cerrar lo cierra, para quien no tiene Escape', async () => {
    render(<Harness />);
    await openWithKeyboard();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tocar afuera del panel lo cierra', async () => {
    render(<Harness />);
    await openWithKeyboard();

    await userEvent.click(screen.getByTestId('wc-drawer-backdrop'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tocar adentro del panel no lo cierra', async () => {
    render(<Harness />);
    await openWithKeyboard();

    await userEvent.click(screen.getByRole('dialog'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('la hoja de abajo es el mismo diálogo, con otra forma', async () => {
    render(
      <Drawer open placement="bottom" label="Nueva marca" onClose={vi.fn()}>
        <button type="button">Guardar</button>
      </Drawer>,
    );

    const dialog = await screen.findByRole('dialog', { name: 'Nueva marca' });
    expect(dialog).toHaveClass('wc-drawer__panel--bottom');
    // El foco entra igual que en el menú: la trampa es la misma.
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });
});
