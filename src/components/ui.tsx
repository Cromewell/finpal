import type { ReactNode } from 'react';
import { numFest, numFlex, parseDezimal, zumBearbeiten } from '../lib/format';
import { useId, useState } from 'react';

/* --- Symbole (Inline-SVG, einheitlich 16 px, currentColor) ---------------- */

type IconProps = { size?: number };

export function IconShield({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5 3 3.2v4.3c0 3 2.1 5.7 5 6.9 2.9-1.2 5-3.9 5-6.9V3.2L8 1.5Z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m5.8 8 1.6 1.6L10.4 6.6" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconOffline({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.5 8a6.5 6.5 0 0 1 13 0M4 8a4 4 0 0 1 8 0" stroke="currentColor"
        strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function IconScale({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v12M3.5 5h9M3.5 5 1.5 9.5h4L3.5 5ZM12.5 5l-2 4.5h4l-2-4.5Z"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconClock({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.6V8l2.4 1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconInfo({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7.2v3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="5.2" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function IconWarn({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.2 1.8 13h12.4L8 2.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 6.4v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.3" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function IconArrow({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 10h13m-4.5-4.5L16.5 10 12 14.5" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSun({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconMoon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13.3 10.2A5.8 5.8 0 0 1 5.8 2.7a5.8 5.8 0 1 0 7.5 7.5Z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLink({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.4 9.6 9.6 6.4M7 4.2l1.3-1.3a2.7 2.7 0 0 1 3.8 3.8L10.8 8M9 11.8l-1.3 1.3a2.7 2.7 0 0 1-3.8-3.8L5.2 8"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDownload({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v7.5m0 0L5.3 6.8M8 9.5l2.7-2.7M2.5 11.5V13a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1.5"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPrint({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.5 6V2.5h7V6M4.5 12H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1.5M4.5 9.5h7v4h-7v-4Z"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconReset({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.7M2.5 2.2v2.9h2.9"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* --- Karte ---------------------------------------------------------------- */

export function Card({
  title, note, children, headExtra,
}: {
  title?: string;
  note?: string;
  headExtra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      {title && (
        <header className="card__head">
          <h2 className="card__title">{title}</h2>
          {headExtra}
          {note && <span className="card__note">{note}</span>}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}

/* --- Formularbausteine --------------------------------------------------- */

export function Field({
  label, hint, children, htmlFor,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="field__hint" id={htmlFor ? `${htmlFor}-hint` : undefined}>{hint}</span>}
    </div>
  );
}

export function NumberField({
  label, hint, value, onChange, unit, min, max, gruppiert = true, dezimalstellen, id: vorgabe,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (wert: number) => void;
  unit?: string;
  /** Untergrenze — wird erst beim Verlassen des Feldes angewandt. */
  min?: number;
  /** Obergrenze — wird erst beim Verlassen des Feldes angewandt. */
  max?: number;
  /** Tausenderpunkte in der Anzeige (bei Jahreszahlen abschalten). */
  gruppiert?: boolean;
  /** Feste Nachkommastellen in der Ruhedarstellung — für Geldbeträge 2. */
  dezimalstellen?: number;
  id?: string;
}) {
  const auto = useId();
  const id = vorgabe ?? auto;

  // Solange getippt wird, gilt der Rohtext. Dadurch bleiben Zwischenstände wie
  // "", "3" oder "32," unangetastet — früher wurden sie sofort zu einer Zahl
  // gerundet und begrenzt, sodass aus "35" über "135" am Ende "60" wurde.
  const [entwurf, setzeEntwurf] = useState<string | null>(null);

  const begrenze = (wert: number) =>
    Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, wert));

  const ruhe = () => {
    if (!gruppiert) return zumBearbeiten(value);
    return dezimalstellen === undefined ? numFlex(value) : numFest(value, dezimalstellen);
  };
  const anzeige = entwurf ?? ruhe();

  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div className="input-affix">
        <input
          id={id}
          className="control"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={anzeige}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onFocus={() => setzeEntwurf(zumBearbeiten(value))}
          onChange={(e) => {
            setzeEntwurf(e.target.value);
            const geparst = parseDezimal(e.target.value);
            // Unfertige Eingaben lassen den bisherigen Wert einfach stehen.
            if (geparst !== null && geparst !== value) onChange(geparst);
          }}
          onBlur={() => {
            const geparst = entwurf === null ? value : parseDezimal(entwurf);
            setzeEntwurf(null);
            // Erst jetzt begrenzen — und bei leerem Feld den alten Wert behalten.
            const endgueltig = begrenze(geparst ?? value);
            if (endgueltig !== value) onChange(endgueltig);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        {unit && <span className="input-affix__unit">{unit}</span>}
      </div>
    </Field>
  );
}

export function SelectField<T extends string | number>({
  label, hint, value, onChange, options,
}: {
  label: string;
  hint?: string;
  value: T;
  onChange: (wert: T) => void;
  options: { wert: T; label: string }[];
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select
        id={id}
        className="control"
        value={String(value)}
        onChange={(e) => {
          const gewaehlt = options.find((o) => String(o.wert) === e.target.value);
          if (gewaehlt) onChange(gewaehlt.wert);
        }}
      >
        {options.map((o) => (
          <option key={String(o.wert)} value={String(o.wert)}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function Segmented<T extends string | number>({
  label, hint, value, onChange, options,
}: {
  label?: string;
  hint?: string;
  value: T;
  onChange: (wert: T) => void;
  options: { wert: T; label: string; titel?: string }[];
}) {
  const inhalt = (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.wert)}
          type="button"
          className="segmented__option"
          aria-pressed={o.wert === value}
          title={o.titel}
          onClick={() => onChange(o.wert)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
  if (!label) return inhalt;
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {inhalt}
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export function Switch({
  label, hint, checked, onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (wert: boolean) => void;
}) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true" />
      <span className="switch__text">
        <span className="switch__label">{label}</span>
        {hint && <span className="switch__hint">{hint}</span>}
      </span>
    </label>
  );
}

export function Note({ art = 'info', children }: { art?: 'info' | 'warnung'; children: ReactNode }) {
  return (
    <div className={`note${art === 'warnung' ? ' note--warnung' : ''}`}>
      <span className="note__icon">{art === 'warnung' ? <IconWarn /> : <IconInfo />}</span>
      <span>{children}</span>
    </div>
  );
}

export function Insight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="insight">
      <span className="insight__title">{title}</span>
      <p className="insight__text">{children}</p>
    </div>
  );
}
