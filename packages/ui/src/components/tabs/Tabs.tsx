import { useId, useRef } from 'react';
import './Tabs.css';

export interface TabOption<TValue extends string> {
  value: TValue;
  label: string;
}

export interface TabsProps<TValue extends string> {
  /** El nombre de la lista de pestañas, para el lector de pantalla. */
  label: string;
  tabs: readonly TabOption<TValue>[];
  /** La pestaña activa. Vive afuera: la pantalla la guarda en la URL (spec §5.3). */
  value: TValue;
  onChange: (value: TValue) => void;
  /** El contenido de la pestaña activa. */
  children: React.ReactNode;
}

/**
 * Pestañas según el patrón de WAI-ARIA, con activación manual: las flechas, Home y End
 * mueven el foco, y Enter o Espacio activan. Así recorrer las pestañas con el teclado no
 * cambia el panel —ni la URL— en cada tecla. Un solo panel, el de la activa.
 */
export function Tabs<TValue extends string>({
  label,
  tabs,
  value,
  onChange,
  children,
}: TabsProps<TValue>): React.JSX.Element {
  const id = useId();
  const panelId = `${id}-panel`;
  const tabIdFor = (tab: TValue): string => `${id}-tab-${tab}`;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusAt(index: number): void {
    const count = tabs.length;
    refs.current[((index % count) + count) % count]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) {
      return;
    }

    event.preventDefault();
    focusAt(target);
  }

  return (
    <div className="wc-tabs">
      <div role="tablist" aria-label={label} className="wc-tabs__list">
        {tabs.map((tab, index) => {
          const selected = tab.value === value;

          return (
            <button
              key={tab.value}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={tabIdFor(tab.value)}
              className="wc-tabs__tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                if (!selected) {
                  onChange(tab.value);
                }
              }}
              onKeyDown={(event) => {
                onKeyDown(event, index);
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabIdFor(value)}
        className="wc-tabs__panel"
      >
        {children}
      </div>
    </div>
  );
}
