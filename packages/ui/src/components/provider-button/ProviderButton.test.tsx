import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProviderButton } from './ProviderButton.tsx';

describe('ProviderButton', () => {
  it('es un botón accesible por su texto; el logo es decorativo', () => {
    render(<ProviderButton provider="google">Continuar con Google</ProviderButton>);

    const button = screen.getByRole('button', { name: 'Continuar con Google' });
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('es type="button": dentro de un form no lo manda sin querer', () => {
    render(<ProviderButton provider="microsoft">Continuar con Microsoft</ProviderButton>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('lleva el logo de cada proveedor, sin tocar sus colores', () => {
    const { container, rerender } = render(
      <ProviderButton provider="google">Continuar con Google</ProviderButton>,
    );
    // Los cuatro colores de la "G" de Google, tal cual los fijan sus lineamientos de marca.
    const google = Array.from(container.querySelectorAll('path')).map((path) =>
      path.getAttribute('fill'),
    );
    expect(google).toEqual(['#EA4335', '#4285F4', '#FBBC05', '#34A853']);

    rerender(<ProviderButton provider="microsoft">Continuar con Microsoft</ProviderButton>);
    // Los cuatro cuadrados de Microsoft, también con sus colores.
    const microsoft = Array.from(container.querySelectorAll('rect')).map((rect) =>
      rect.getAttribute('fill'),
    );
    expect(microsoft).toEqual(['#F25022', '#7FBA00', '#00A4EF', '#FFB900']);
  });

  it('un proveedor sin marca propia lleva un ícono genérico, del color del texto', () => {
    const { container } = render(
      <ProviderButton provider="generic">Continuar con Ingreso de desarrollo</ProviderButton>,
    );

    expect(container.querySelector('svg')).toHaveAttribute('stroke', 'currentColor');
  });

  it('aplica la clase de cada proveedor', () => {
    const { rerender } = render(<ProviderButton provider="google">x</ProviderButton>);
    expect(screen.getByRole('button')).toHaveClass('wc-provider-button--google');

    rerender(<ProviderButton provider="microsoft">x</ProviderButton>);
    expect(screen.getByRole('button')).toHaveClass('wc-provider-button--microsoft');

    rerender(<ProviderButton provider="generic">x</ProviderButton>);
    expect(screen.getByRole('button')).toHaveClass('wc-provider-button--generic');
  });

  it('llama onClick al hacer click y con el teclado', async () => {
    const onClick = vi.fn();
    render(
      <ProviderButton provider="google" onClick={onClick}>
        Continuar con Google
      </ProviderButton>,
    );

    await userEvent.click(screen.getByRole('button'));
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('deshabilitado no dispara onClick', async () => {
    const onClick = vi.fn();
    render(
      <ProviderButton provider="google" disabled onClick={onClick}>
        Continuar con Google
      </ProviderButton>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('pasa los atributos del botón, como aria-busy, y conserva las clases que le den', () => {
    render(
      <ProviderButton provider="google" aria-busy="true" className="mia">
        Continuar con Google
      </ProviderButton>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveClass('wc-provider-button', 'mia');
  });
});
