import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionHeader } from './SectionHeader.tsx';

describe('SectionHeader', () => {
  it('es un título de sección: un h2 por default', () => {
    render(<SectionHeader title="Elegí tu carga" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Elegí tu carga' })).toBeInTheDocument();
  });

  it('puede ser un h3 cuando la sección está adentro de otra', () => {
    render(<SectionHeader title="Por capacidad" level={3} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Por capacidad' })).toBeInTheDocument();
  });

  it('el id va en el título, para que la sección lo use de nombre', () => {
    render(
      <section aria-labelledby="historial">
        <SectionHeader id="historial" title="Historial de RM" />
      </section>,
    );

    expect(screen.getByRole('region', { name: 'Historial de RM' })).toBeInTheDocument();
  });

  it('muestra la etiqueta de arriba y el dato de la derecha', () => {
    render(
      <SectionHeader title="Progreso del RM" kicker="Tendencia de fuerza" meta="03 registros" />,
    );

    expect(screen.getByText('Tendencia de fuerza')).toBeInTheDocument();
    expect(screen.getByText('03 registros')).toBeInTheDocument();
  });

  it('la etiqueta de arriba no es parte del nombre del título', () => {
    render(<SectionHeader title="Progreso del RM" kicker="Tendencia de fuerza" />);

    expect(screen.getByRole('heading', { name: 'Progreso del RM' })).toBeInTheDocument();
  });

  it('lleva la línea de abajo salvo que se la saque', () => {
    const { container, rerender } = render(<SectionHeader title="Historial" />);
    expect(container.firstChild).toHaveClass('wc-section-header--divider');

    rerender(<SectionHeader title="Historial" divider={false} />);
    expect(container.firstChild).not.toHaveClass('wc-section-header--divider');
  });
});
