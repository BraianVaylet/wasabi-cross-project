import { Link } from '@tanstack/react-router';
import { Logo } from '@wasabi-cross/ui';

export function NotFoundPage(): React.JSX.Element {
  return (
    <main className="wc-root screen">
      <Logo size="large" />
      <h1 className="page__title">Nada por acá</h1>
      <p>No encontramos lo que buscás.</p>
      <Link to="/" className="wc-button wc-button--primary">
        Volver a tus ejercicios
      </Link>
    </main>
  );
}
