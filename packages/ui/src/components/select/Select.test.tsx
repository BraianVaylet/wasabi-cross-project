import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select.tsx';

function Nivel(props: { error?: string; onChange?: () => void }) {
  return (
    <Select label="Nivel" defaultValue="" {...props}>
      <option value="" disabled>
        Elegí uno
      </option>
      <option value="principiante">Principiante</option>
      <option value="intermedio">Intermedio</option>
    </Select>
  );
}

describe('Select', () => {
  it('tiene su label asociado', () => {
    render(<Nivel />);

    expect(screen.getByLabelText('Nivel')).toBeInTheDocument();
  });

  it('elegir una opción avisa', async () => {
    const onChange = vi.fn();
    render(<Nivel onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText('Nivel'), 'intermedio');

    expect(onChange).toHaveBeenCalled();
  });

  it('con error, lo marca y lo asocia al campo', () => {
    render(<Nivel error="Elegí un nivel" />);

    const select = screen.getByLabelText('Nivel');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription('Elegí un nivel');
    expect(screen.getByRole('alert')).toHaveTextContent('Elegí un nivel');
  });
});
