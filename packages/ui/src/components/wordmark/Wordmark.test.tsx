import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wordmark } from './Wordmark.tsx';

describe('Wordmark', () => {
  it('se lee "Wasabi Cross": las barras del diseño son decoración', () => {
    render(
      <a href="/">
        <Wordmark />
      </a>,
    );

    expect(screen.getByRole('link', { name: 'Wasabi Cross' })).toBeInTheDocument();
  });

  it('lleva el subtítulo cuando se lo dan, sin sumarlo al nombre del link', () => {
    render(
      <a href="/">
        <Wordmark subtitle="Fuerza · Registro de RM" />
      </a>,
    );

    expect(screen.getByText('Fuerza · Registro de RM')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wasabi Cross' })).toBeInTheDocument();
  });

  it('sin subtítulo, no deja un renglón vacío', () => {
    const { container } = render(<Wordmark />);

    expect(container.querySelector('.wc-wordmark__subtitle')).toBeNull();
  });

  it('tiene un tamaño grande para el splash', () => {
    const { container } = render(<Wordmark size="large" />);

    expect(container.firstElementChild).toHaveClass('wc-wordmark--large');
  });
});
