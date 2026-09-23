import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tag } from './Tag.tsx';

describe('Tag', () => {
  it('muestra su contenido', () => {
    render(<Tag>Light load</Tag>);

    expect(screen.getByText('Light load')).toBeInTheDocument();
  });

  it('es outline por default', () => {
    render(<Tag>Light load</Tag>);

    expect(screen.getByText('Light load')).toHaveClass('wc-tag--outline');
  });

  it('aplica la clase de cada variante', () => {
    const { rerender } = render(<Tag variant="solid">current</Tag>);
    expect(screen.getByText('current')).toHaveClass('wc-tag--solid');

    rerender(<Tag variant="neutral">running</Tag>);
    expect(screen.getByText('running')).toHaveClass('wc-tag--neutral');

    rerender(<Tag variant="danger">Con dolor</Tag>);
    expect(screen.getByText('Con dolor')).toHaveClass('wc-tag--danger');

    rerender(<Tag variant="success">Carga liviana</Tag>);
    expect(screen.getByText('Carga liviana')).toHaveClass('wc-tag--success');

    rerender(<Tag variant="warning">Carga media</Tag>);
    expect(screen.getByText('Carga media')).toHaveClass('wc-tag--warning');
  });
});
