import type { SessionUser } from '@wasabi-cross/schemas';

export interface HomePageProps {
  user: SessionUser;
}

/** Home (mockup 4). La lista de ejercicios llega con F1-11. */
export function HomePage({ user }: HomePageProps): React.JSX.Element {
  return (
    <>
      <p className="page__greeting">¡Hola, {user.name}!</p>
      <h1 className="page__title">Tus ejercicios</h1>
    </>
  );
}
