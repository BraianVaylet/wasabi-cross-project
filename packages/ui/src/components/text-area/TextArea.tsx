import { useId, type TextareaHTMLAttributes } from 'react';
import './TextArea.css';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  error?: string | undefined;
}

/** Texto largo con su label: los comentarios del mockup 9. */
export function TextArea({ label, error, className, ...rest }: TextAreaProps): React.JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div
      className={['wc-text-area', error ? 'wc-text-area--invalid' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <label className="wc-text-area__label" htmlFor={id}>
        {label}
      </label>

      <textarea
        id={id}
        className="wc-text-area__input"
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...rest}
      />

      {error ? (
        <p id={errorId} className="wc-text-area__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
