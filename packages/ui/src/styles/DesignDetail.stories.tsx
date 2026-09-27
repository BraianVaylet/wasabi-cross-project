import type { Meta, StoryObj } from '@storybook/react-vite';
import { BottomBar } from '../components/bottom-bar/BottomBar.tsx';
import { Button } from '../components/button/Button.tsx';
import { Card } from '../components/card/Card.tsx';
import { Measure } from '../components/measure/Measure.tsx';
import { PercentTiles } from '../components/percent-tiles/PercentTiles.tsx';
import { SectionHeader } from '../components/section-header/SectionHeader.tsx';
import { Tag } from '../components/tag/Tag.tsx';

/*
 * El detalle de ejercicio del diseño (docs/design) armado sólo con los Componentes Cross que
 * ya existen, con datos fijos: la referencia para compararlo a 390px contra el PNG mientras
 * la pantalla real (F4-05a–d) no está. Lo que todavía falta (el gráfico, F4-04b; el campo
 * del porcentaje personalizado, F4-03b) queda marcado.
 */
const meta = {
  title: 'Fundaciones/Detalle del diseño',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const RM = 100;
const PERCENTAGES = [65, 75, 80, 85, 90, 95];

function Detail(): React.JSX.Element {
  // Fijo, como en el diseño: esto es una referencia visual, no la pantalla. La banda de carga
  // y la carga misma las calcula la pantalla real con las reglas de @wasabi-cross/schemas.
  const percentage = 65;

  return (
    <main
      style={{
        maxWidth: 'var(--wc-column-max)',
        margin: '0 auto',
        padding: '1rem var(--wc-column-gutter) 0',
      }}
    >
      <section aria-labelledby="ejercicio">
        <p className="wc-kicker" style={{ margin: 0 }}>
          ‹ Ejercicios / Fuerza
        </p>
        <h1 id="ejercicio" style={{ margin: '0.25rem 0 0', fontSize: 'var(--wc-font-size-title)' }}>
          Back squat
        </h1>
        <p
          style={{
            margin: '0.25rem 0 0',
            color: 'var(--wc-text-muted)',
            fontSize: 'var(--wc-font-size-caption)',
            letterSpacing: 'var(--wc-tracking-wide)',
            textTransform: 'uppercase',
          }}
        >
          Intermedio <span style={{ color: 'var(--wc-accent-text)' }}>//</span> RM vigente
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1rem',
            padding: '0.75rem 0',
            borderBlock: '1px solid var(--wc-border)',
          }}
        >
          <div>
            <p className="wc-kicker" style={{ margin: 0 }}>
              RM actual
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: 'var(--wc-font-size-xs)' }}>
              REGISTRADO EL 23/06/2026
            </p>
          </div>
          <Measure
            value={RM}
            unit="kg"
            size="lg"
            style={{ paddingLeft: '0.75rem', borderLeft: '2px solid var(--wc-danger)' }}
          />
        </div>
      </section>

      <section aria-labelledby="carga" style={{ marginTop: '1rem' }}>
        <SectionHeader id="carga" title="Elegí tu carga" meta="Porcentaje del RM" />
        <div style={{ marginTop: '0.75rem' }}>
          <PercentTiles
            legend="Porcentaje del RM"
            name="porcentaje"
            options={PERCENTAGES.map((value) => ({
              value,
              label: `${String(value)}%`,
              detail: `${String(value)} kg`,
            }))}
            value={percentage}
            onChange={() => undefined}
          />
        </div>
        <p className="wc-kicker" style={{ marginTop: '0.75rem' }}>
          [Porcentaje personalizado: F4-03b]
        </p>
      </section>

      <section aria-labelledby="progreso" style={{ marginTop: '1.25rem' }}>
        <SectionHeader
          id="progreso"
          title="Progreso del RM"
          kicker="Tendencia de fuerza"
          divider={false}
          meta={
            <span
              style={{
                display: 'block',
                paddingLeft: '0.5rem',
                borderLeft: '1px solid var(--wc-border)',
              }}
            >
              Aumento
              <br />
              <Measure value="+40" unit="kg" size="sm" tone="accent" />
            </span>
          }
        />
        <p className="wc-kicker" style={{ marginTop: '0.75rem' }}>
          [Gráfico de progreso: F4-04b]
        </p>
      </section>

      <section aria-labelledby="historial" style={{ marginTop: '2.5rem' }}>
        <SectionHeader id="historial" title="Historial de RM" meta="03 registros" />
        <ul style={{ display: 'grid', gap: '0.5rem', margin: '0.75rem 0 0', padding: 0 }}>
          {[
            ['23/06/2026', 100],
            ['23/02/2026', 80],
            ['02/06/2025', 60],
          ].map(([date, value], index) => (
            <li key={String(date)} style={{ listStyle: 'none' }}>
              <Card variant={index === 0 ? 'current' : 'past'}>
                <span
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>
                    <span style={{ display: 'block', fontSize: 'var(--wc-font-size-caption)' }}>
                      {date}
                    </span>
                    {index === 0 ? (
                      <span className="wc-kicker" style={{ color: 'var(--wc-danger-on-subtle)' }}>
                        RM actual
                      </span>
                    ) : null}
                  </span>
                  <Measure value={value ?? ''} unit="kg" />
                </span>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <BottomBar label="Carga seleccionada">
        <div style={{ minWidth: 0 }}>
          <p className="wc-kicker" style={{ margin: 0, color: 'var(--wc-text)' }}>
            {percentage}% de {RM} kg
          </p>
          <Measure value={65} unit="kg" size="hero" tone="accent" />
          <p
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.25rem 0 0' }}
          >
            <span className="wc-kicker">Carga calculada</span>
            <Tag variant="success">Carga liviana</Tag>
          </p>
        </div>
        <Button variant="cta" style={{ minHeight: '62px', textAlign: 'left' }}>
          Registrar
          <br />
          nuevo RM
        </Button>
      </BottomBar>
    </main>
  );
}

export const Mobile: Story = {
  render: () => <Detail />,
};
