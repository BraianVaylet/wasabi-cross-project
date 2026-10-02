import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PwaNotice } from './PwaNotice.tsx';

describe('popup de la PWA (reutilizable: instalar y actualizar)', () => {
  it('se anuncia con su nombre y muestra el mensaje', () => {
    render(
      <PwaNotice
        label="Aviso de prueba"
        message="Un mensaje."
        dismissLabel="Cerrar"
        onDismiss={vi.fn()}
      />,
    );

    const aviso = screen.getByRole('status', { name: 'Aviso de prueba' });
    expect(aviso).toHaveTextContent('Un mensaje.');
  });

  it('con acción, ofrece las dos salidas y cada botón hace lo suyo', async () => {
    const onDismiss = vi.fn();
    const onAction = vi.fn();
    render(
      <PwaNotice
        label="Aviso"
        message="Mensaje"
        dismissLabel="Ahora no"
        onDismiss={onDismiss}
        action={{ label: 'Hacer', onClick: onAction }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Hacer' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('sin acción (sólo informa), queda un único botón para cerrarlo', () => {
    render(
      <PwaNotice label="Aviso" message="Mensaje" dismissLabel="Entendido" onDismiss={vi.fn()} />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Entendido' })).toBeInTheDocument();
  });
});
