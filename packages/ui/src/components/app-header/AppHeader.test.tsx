import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppHeader } from './AppHeader.tsx';
import { Logo } from '../logo/Logo.tsx';
import { COLORES } from '../logo/marca.ts';

describe('AppHeader', () => {
  it('es el banner de la página, con la marca a la izquierda y las acciones a la derecha', () => {
    render(
      <AppHeader
        brand={
          <>
            <Logo /> Wasabi Cross
          </>
        }
        actions={<button type="button">Acción</button>}
      />,
    );

    const banner = screen.getByRole('banner');
    expect(banner).toHaveTextContent('Wasabi Cross');
    expect(screen.getByRole('button', { name: 'Acción' })).toBeInTheDocument();
  });
});

describe('Logo', () => {
  it('es decorativo: el nombre de la marca va en texto al lado', () => {
    const { container } = render(<Logo />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('es la marca: una W blanca sobre el fondo verde', () => {
    const { container } = render(<Logo />);

    const marca = container.querySelector('.wc-logo__mark');
    expect(marca?.querySelector('rect')).toHaveAttribute('fill', COLORES.fondo);
    expect(marca?.querySelectorAll('path')).toHaveLength(4);
    expect(marca?.querySelectorAll(`path[fill="${COLORES.letra}"]`)).toHaveLength(4);
  });

  it('tiene un tamaño grande para el splash', () => {
    const { container } = render(<Logo size="large" />);

    expect(container.firstElementChild).toHaveClass('wc-logo--large');
  });
});
