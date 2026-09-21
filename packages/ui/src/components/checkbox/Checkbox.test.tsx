import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox.tsx';

describe('Checkbox', () => {
  it('el label lo enciende y lo apaga, no sólo el cuadradito', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Con dolor" checked={false} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Con dolor'));

    expect(onChange).toHaveBeenCalledOnce();
  });

  it('refleja si está marcado', () => {
    render(<Checkbox label="Con dolor" checked readOnly />);

    expect(screen.getByRole('checkbox', { name: 'Con dolor' })).toBeChecked();
  });
});
