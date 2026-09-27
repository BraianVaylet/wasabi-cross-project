import type { Meta, StoryObj } from '@storybook/react-vite';

/*
 * La tipografía del diseño (docs/design) con los tokens de `tokens.css`: la cabecera del
 * detalle de ejercicio, armada sólo con las utilidades y los titulares globales. Es la
 * referencia para comparar a simple vista contra el HTML del diseño.
 */
const meta = {
  title: 'Fundaciones/Tipografía',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sizes = [
  ['--wc-font-size-2xs', '10px · etiquetas chicas (piso, spec §11)'],
  ['--wc-font-size-xs', '11px · fechas, estados, valores chicos'],
  ['--wc-font-size-caption', '12px · textos de apoyo'],
  ['--wc-font-size-heading', '24–28px · títulos de sección'],
  ['--wc-font-size-title', '38–44px · el nombre del ejercicio'],
  ['--wc-font-size-hero', '58–68px · la carga calculada'],
] as const;

/** La cabecera del detalle, como en el diseño. */
export const ExerciseHeader: Story = {
  render: () => (
    <div style={{ maxWidth: '390px' }}>
      <p className="wc-kicker" style={{ margin: 0 }}>
        ‹ Ejercicios / Fuerza
      </p>
      <h1 style={{ margin: '0.25rem 0 0', fontSize: 'var(--wc-font-size-title)' }}>
        Sentadilla trasera
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
      <h2
        style={{
          margin: '1.5rem 0 0',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid var(--wc-border)',
          fontSize: 'var(--wc-font-size-heading)',
        }}
      >
        Elegí tu carga
      </h2>
      <p
        className="wc-display"
        style={{ margin: '1.5rem 0 0', fontSize: 'var(--wc-font-size-hero)' }}
      >
        <span style={{ color: 'var(--wc-accent-text)' }}>65</span>{' '}
        <span style={{ fontSize: '1.375rem' }}>kg</span>
      </p>
      <p className="wc-kicker" style={{ margin: 0 }}>
        Carga calculada
      </p>
    </div>
  ),
};

/** La escala, de chica a grande. */
export const Scale: Story = {
  render: () => (
    <dl style={{ display: 'grid', gap: '0.75rem', margin: 0 }}>
      {sizes.map(([token, use]) => (
        <div key={token}>
          <dt className="wc-kicker">{token}</dt>
          <dd className="wc-display" style={{ margin: 0, fontSize: `var(${token})` }}>
            Wasabi // Cross — {use}
          </dd>
        </div>
      ))}
    </dl>
  ),
};
