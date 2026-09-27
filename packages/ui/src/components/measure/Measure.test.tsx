import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Measure } from './Measure.tsx';

describe('Measure', () => {
  it('se lee como número y unidad, separados', () => {
    const { container } = render(<Measure value={100} unit="kg" />);

    expect(container.firstChild).toHaveTextContent(/^100 kg$/);
  });

  it('sin unidad muestra sólo el número', () => {
    const { container } = render(<Measure value="4:32" />);

    expect(container.firstChild).toHaveTextContent(/^4:32$/);
    expect(container.querySelector('.wc-measure__unit')).toBeNull();
  });

  it('el tamaño y el tono van como clases', () => {
    const { container } = render(<Measure value={65} unit="kg" size="hero" tone="accent" />);

    expect(container.firstChild).toHaveClass('wc-measure--hero', 'wc-measure--accent');
  });

  it('por default es mediana y del color del texto', () => {
    const { container } = render(<Measure value={80} unit="kg" />);

    expect(container.firstChild).toHaveClass('wc-measure--md', 'wc-measure--default');
  });

  it('acepta atributos extra, como un data-testid', () => {
    render(<Measure value={65} unit="kg" data-testid="carga" />);

    expect(screen.getByTestId('carga')).toHaveTextContent('65 kg');
  });
});
