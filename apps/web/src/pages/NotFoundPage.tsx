import { Link } from '@tanstack/react-router';

export function NotFoundPage(): React.JSX.Element {
  return (
    <main className="wc-root screen">
      <p>No encontramos lo que buscás.</p>
      <Link to="/">Volver a tus ejercicios</Link>
    </main>
  );
}
