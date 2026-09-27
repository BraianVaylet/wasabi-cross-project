import './PercentTiles.css';

export interface PercentTileOption {
  value: number;
  /** Lo grande: "65%". */
  label: string;
  /** Lo chico, abajo: "65 kg", "8 reps". */
  detail: string;
}

export interface PercentTilesProps {
  /** El nombre del grupo para el lector de pantalla. En pantalla lo dice el título de la sección. */
  legend: string;
  /** El `name` de los radios: los agrupa para las flechas del teclado. */
  name: string;
  options: readonly PercentTileOption[];
  /** El elegido. Uno que no está en la grilla (un porcentaje a mano) no marca ninguno. */
  value: number | undefined;
  onChange: (value: number) => void;
}

/**
 * La grilla "ELIGE TU CARGA" del diseño: casilleros de un solo elegido. Por dentro son radios
 * reales, así que el teclado y el lector de pantalla los tratan como cualquier grupo de
 * radios (flechas para moverse, "65% · 65 kg, 1 de 6"). Sólo muestra: qué carga es cada
 * porcentaje lo calcula la pantalla.
 */
export function PercentTiles({
  legend,
  name,
  options,
  value,
  onChange,
}: PercentTilesProps): React.JSX.Element {
  return (
    <fieldset className="wc-percent-tiles">
      <legend className="wc-visually-hidden">{legend}</legend>

      <div className="wc-percent-tiles__grid">
        {options.map((option) => (
          <label key={option.value} className="wc-percent-tiles__tile">
            <input
              type="radio"
              className="wc-percent-tiles__input"
              name={name}
              value={option.value}
              // Sin esto se lee "65%65 kg", pegado: son dos cajas vecinas.
              aria-label={`${option.label} · ${option.detail}`}
              checked={option.value === value}
              onChange={() => {
                onChange(option.value);
              }}
            />
            <span className="wc-percent-tiles__face" aria-hidden="true">
              <span className="wc-percent-tiles__label">{option.label}</span>
              <span className="wc-percent-tiles__detail">{option.detail}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
