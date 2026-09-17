import { Button, Card, Tag, TextField, ThemeToggle, useTheme } from '@wasabi-cross/ui';

/**
 * Pantalla puente de la Fase 0: prueba de punta a punta que los Componentes Cross y el
 * tema andan en la app real. Las páginas de la spec §5 llegan en la Fase 1.
 */
export function App(): React.JSX.Element {
  const { theme, toggle } = useTheme();

  return (
    <div className="wc-root" style={{ minHeight: '100vh', padding: '1rem' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <h1 style={{ fontSize: 'var(--wc-font-size-lg)', margin: 0 }}>Wasabi Cross</h1>
        <ThemeToggle theme={theme} onToggle={toggle} />
      </header>

      <main style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
        <Card>
          <strong style={{ color: 'var(--wc-accent-text)' }}>Back SQ</strong>
          <p style={{ margin: '0.25rem 0 0' }}>RM from 23/06/2026 · 100 kg</p>
        </Card>

        <Tag>Light load</Tag>

        <TextField label="Custom percentage" placeholder="Ej: 98" suffix="%" inputMode="numeric" />

        <Button block>New Exercice</Button>
      </main>
    </div>
  );
}
