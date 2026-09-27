import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomBar } from './BottomBar.tsx';

/** Un ResizeObserver de mentira: jsdom no tiene, y así el test decide cuándo "mide". */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve() {
    // No hace falta para estos tests.
  }

  disconnect() {
    this.disconnected = true;
  }

  fire() {
    this.callback([], this);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  FakeResizeObserver.instances = [];
});

describe('BottomBar', () => {
  it('es una región con nombre, con lo que le pongan adentro', () => {
    render(
      <BottomBar label="Carga seleccionada">
        <span>65 kg</span>
      </BottomBar>,
    );

    const region = screen.getByRole('region', { name: 'Carga seleccionada' });
    expect(region).toHaveTextContent('65 kg');
  });

  it('reserva abajo del contenido el mismo alto que ocupa, para no taparlo', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      height: 132,
    } as DOMRect);

    const { container } = render(
      <BottomBar label="Carga seleccionada">
        <span>65 kg</span>
      </BottomBar>,
    );
    act(() => {
      FakeResizeObserver.instances[0]?.fire();
    });

    const spacer = container.querySelector('.wc-bottom-bar__spacer');
    expect(spacer).toHaveAttribute('aria-hidden', 'true');
    expect(spacer).toHaveStyle({ height: '132px' });
  });

  it('mide la barra, no otra cosa', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    render(<BottomBar label="Carga seleccionada">x</BottomBar>);

    expect(FakeResizeObserver.instances[0]?.observed).toEqual([
      screen.getByRole('region', { name: 'Carga seleccionada' }),
    ]);
  });

  it('deja de medir cuando se va de la pantalla', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    const { unmount } = render(<BottomBar label="Carga seleccionada">x</BottomBar>);
    unmount();

    expect(FakeResizeObserver.instances[0]?.disconnected).toBe(true);
  });

  it('sin ResizeObserver no rompe: la reserva queda con el alto por default del CSS', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    const { container } = render(<BottomBar label="Carga seleccionada">x</BottomBar>);

    expect(container.querySelector('.wc-bottom-bar__spacer')).not.toHaveAttribute('style');
  });
});
