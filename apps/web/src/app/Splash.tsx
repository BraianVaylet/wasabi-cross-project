import { Logo } from '@wasabi-cross/ui';

/** El splash del mockup 1: mientras la app averigua si hay sesión. */
export function Splash(): React.JSX.Element {
  return (
    <div role="status" aria-busy="true" className="wc-root splash">
      <Logo size="large" />
      <p className="splash__name">Wasabi Cross</p>
    </div>
  );
}
