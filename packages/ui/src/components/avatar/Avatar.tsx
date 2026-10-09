import { useState } from 'react';
import './Avatar.css';

export type AvatarSize = 'md' | 'lg';

export interface AvatarProps {
  /** De quién es: de acá salen las iniciales. */
  name: string;
  /** La foto. Sin ella, o si no carga, se muestran las iniciales. */
  src?: string | undefined;
  size?: AvatarSize;
  className?: string | undefined;
}

/**
 * Las iniciales de un nombre: la primera letra de las dos primeras palabras, en mayúscula. Se
 * cuentan caracteres y no unidades de UTF-16, para que un emoji no se parta a la mitad.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((word) => (Array.from(word)[0] ?? '').toLocaleUpperCase()).join('');

  return initials === '' ? '?' : initials;
}

/**
 * La foto de una persona, o sus iniciales (F9-08, spec §5.6). Cuadrada, como el resto del diseño.
 * Decorativa: va siempre junto al nombre escrito, así que la foto no lleva `alt` y las iniciales no
 * se leen. Si la foto no carga —la API contesta 404, el proveedor se cayó— cae a las iniciales en
 * vez de dejar un ícono roto; si `src` cambia, se vuelve a intentar con la nueva.
 */
export function Avatar({ name, src, size = 'md', className }: AvatarProps): React.JSX.Element {
  // Cuál foto falló, y no un booleano: una URL nueva no hereda el fallo de la anterior.
  const [failed, setFailed] = useState<string | undefined>(undefined);
  const showPhoto = src !== undefined && src !== '' && failed !== src;
  const classes = ['wc-avatar', `wc-avatar--${size}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {showPhoto ? (
        <img
          className="wc-avatar__photo"
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => {
            setFailed(src);
          }}
        />
      ) : (
        <span className="wc-avatar__initials" aria-hidden="true">
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
