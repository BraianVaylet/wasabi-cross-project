import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TextArea } from './TextArea.tsx';

describe('TextArea', () => {
  it('tiene su label asociado y escribe', async () => {
    render(<TextArea label="Comentarios" />);

    await userEvent.type(screen.getByLabelText('Comentarios'), 'Molestia en el hombro');

    expect(screen.getByLabelText('Comentarios')).toHaveValue('Molestia en el hombro');
  });

  it('con error, lo marca y lo asocia al campo', () => {
    render(<TextArea label="Comentarios" error="Como máximo 500 caracteres" />);

    expect(screen.getByLabelText('Comentarios')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Comentarios')).toHaveAccessibleDescription(
      'Como máximo 500 caracteres',
    );
  });
});
