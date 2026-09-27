import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TextField } from './TextField.tsx';

describe('TextField', () => {
  it('asocia el label con el input: se puede buscar por su nombre', () => {
    render(<TextField label="Custom percentage" />);

    expect(screen.getByLabelText('Custom percentage')).toBeInTheDocument();
  });

  it('escribe lo que se tipea', async () => {
    render(<TextField label="Custom percentage" />);

    await userEvent.type(screen.getByLabelText('Custom percentage'), '98');

    expect(screen.getByLabelText('Custom percentage')).toHaveValue('98');
  });

  it('cada instancia tiene su propio id: dos campos no se pisan', () => {
    render(
      <>
        <TextField label="Uno" />
        <TextField label="Dos" />
      </>,
    );

    expect(screen.getByLabelText('Uno').id).not.toBe(screen.getByLabelText('Dos').id);
  });

  it('sin error, el input no se anuncia como inválido', () => {
    render(<TextField label="Peso" />);

    expect(screen.getByLabelText('Peso')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('con error, lo marca como inválido y lo describe', () => {
    render(<TextField label="Peso" error="El valor cargado no es válido." />);

    const input = screen.getByLabelText('Peso');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('El valor cargado no es válido.');
  });

  it('el error se anuncia al aparecer', () => {
    render(<TextField label="Peso" error="El valor cargado no es válido." />);

    expect(screen.getByRole('alert')).toHaveTextContent('El valor cargado no es válido.');
  });

  it('muestra el sufijo, sin que el lector de pantalla lo confunda con el valor', () => {
    render(<TextField label="Custom percentage" suffix="%" />);

    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('por default va apilado: el label arriba del campo', () => {
    const { container } = render(<TextField label="Email" />);

    expect(container.firstChild).not.toHaveClass('wc-text-field--inline');
  });

  it('en línea, como el porcentaje personalizado del diseño, sigue asociando su label', async () => {
    const { container } = render(
      <TextField label="Porcentaje personalizado" variant="inline" suffix="%" placeholder="—" />,
    );

    expect(container.firstChild).toHaveClass('wc-text-field--inline');
    await userEvent.type(screen.getByLabelText('Porcentaje personalizado'), '98');
    expect(screen.getByLabelText('Porcentaje personalizado')).toHaveValue('98');
  });

  it('en línea, el error va afuera de la caja del campo, y se anuncia igual', () => {
    const { container } = render(
      <TextField label="Porcentaje personalizado" variant="inline" error="Entre 1 y 100." />,
    );

    const box = container.querySelector('.wc-text-field__field');
    expect(box).not.toContainElement(screen.getByRole('alert'));
    expect(screen.getByLabelText('Porcentaje personalizado')).toHaveAccessibleDescription(
      'Entre 1 y 100.',
    );
  });

  it('deja pasar los atributos del input', async () => {
    render(<TextField label="Peso" placeholder="Ej: 98" inputMode="numeric" disabled />);

    const input = screen.getByLabelText('Peso');
    expect(input).toHaveAttribute('placeholder', 'Ej: 98');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toBeDisabled();
    await userEvent.type(input, '5');
    expect(input).toHaveValue('');
  });
});
