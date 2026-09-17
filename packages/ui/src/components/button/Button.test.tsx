import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button.tsx';

describe('Button', () => {
  it('renderiza como botón accesible por su texto', () => {
    render(<Button>New Exercice</Button>);

    expect(screen.getByRole('button', { name: 'New Exercice' })).toBeInTheDocument();
  });

  it('es type="button" por default: dentro de un form no lo manda sin querer', () => {
    render(<Button>Guardar</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('permite pedir type="submit" explícitamente', () => {
    render(<Button type="submit">Enviar</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('llama onClick al hacer click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tocame</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('se puede activar con teclado', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tocame</Button>);

    await userEvent.tab();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('deshabilitado no dispara onClick', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Tocame
      </Button>,
    );

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('aplica la clase de cada variante', () => {
    const { rerender } = render(<Button variant="secondary">x</Button>);
    expect(screen.getByRole('button')).toHaveClass('wc-button--secondary');

    rerender(<Button variant="danger">x</Button>);
    expect(screen.getByRole('button')).toHaveClass('wc-button--danger');

    rerender(<Button variant="ghost">x</Button>);
    expect(screen.getByRole('button')).toHaveClass('wc-button--ghost');
  });

  it('block ocupa todo el ancho', () => {
    render(<Button block>x</Button>);

    expect(screen.getByRole('button')).toHaveClass('wc-button--block');
  });

  it('conserva las clases que le pasen', () => {
    render(<Button className="mia">x</Button>);

    expect(screen.getByRole('button')).toHaveClass('wc-button', 'mia');
  });
});
