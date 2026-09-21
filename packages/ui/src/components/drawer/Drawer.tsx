import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from '../icon-button/IconButton.tsx';
import { CloseIcon } from '../icons/icons.tsx';
import './Drawer.css';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface DrawerProps {
  open: boolean;
  /** `side` es el menú (mockup 4a); `bottom`, la hoja que sube (mockup 11). */
  placement?: 'side' | 'bottom';
  onClose: () => void;
  /** Nombre accesible del diálogo, como "Menú principal". */
  label: string;
  /** Nombre accesible del botón de cerrar. */
  closeLabel?: string;
  children: ReactNode;
}

/**
 * Panel lateral modal, como el menú del mockup 4a. Mientras está abierto el foco no sale de
 * él (WCAG 2.1.2 y 2.4.3); Escape, el botón de cerrar o tocar afuera lo cierran, y el foco
 * vuelve a quien lo abrió.
 */
export function Drawer({ open, ...panel }: DrawerProps): React.JSX.Element | null {
  return open ? <DrawerPanel {...panel} /> : null;
}

function DrawerPanel({
  onClose,
  label,
  closeLabel = 'Cerrar',
  placement = 'side',
  children,
}: Omit<DrawerProps, 'open'>): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    /* v8 ignore next 3 -- el ref siempre está puesto cuando corre el efecto */
    if (!panel) {
      return;
    }

    const focusables = () => [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
    focusables()[0]?.focus();

    // En el documento y no en el panel: si el foco se fue a `body` por un clic en una zona
    // no enfocable, un listener del panel ya no se enteraría del Tab ni del Escape.
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const items = focusables();
      const first = items[0];
      const last = items.at(-1);
      /* v8 ignore next 4 -- el panel siempre tiene al menos el botón de cerrar */
      if (!first || !last) {
        event.preventDefault();
        return;
      }

      const active = document.activeElement;
      const inside = active instanceof Node && panel?.contains(active) && active !== panel;

      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener?.isConnected) {
        opener.focus();
      }
    };
  }, []);

  return (
    <div className="wc-drawer">
      <div className="wc-drawer__backdrop" data-testid="wc-drawer-backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`wc-drawer__panel wc-drawer__panel--${placement}`}
      >
        <div className="wc-drawer__top">
          <IconButton label={closeLabel} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
