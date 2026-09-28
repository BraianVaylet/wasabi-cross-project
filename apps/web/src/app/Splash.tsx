import { Logo, Wordmark } from '@wasabi-cross/ui';
import { BRAND_SUBTITLE } from './shell/AppShell.tsx';

/** El splash del mockup 1, con la marca del diseño: mientras la app averigua si hay sesión. */
export function Splash(): React.JSX.Element {
  return (
    <div role="status" aria-busy="true" className="wc-root splash">
      <Logo size="large" />
      <Wordmark size="large" subtitle={BRAND_SUBTITLE} />
    </div>
  );
}
