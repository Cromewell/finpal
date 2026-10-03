import { useState } from 'react';
import {
  BUNDESLAENDER, JAHR, STEUERKLASSEN, SV,
  type Steuerklasse,
} from '../lib/constants';
import type { PayrollInput } from '../lib/payroll';
import { num, parseDezimal, zumBearbeiten } from '../lib/format';
import {
  Field, NumberField, Note, SelectField, Segmented, Switch,
} from './ui';

type Patch = (teil: Partial<PayrollInput>) => void;

export function EingabeFormular({
  werte, patch, bruttoLabel = 'Bruttogehalt', bruttoHinweis,
}: {
  werte: PayrollInput;
  patch: Patch;
  bruttoLabel?: string;
  bruttoHinweis?: string;
}) {
  const [zeitraum, setzeZeitraum] = useState<'monat' | 'jahr'>('monat');
  const [faktorText, setzeFaktorText] = useState<string | null>(null);
  const privat = werte.kvTyp === 'privat';
  const minijob = werte.bruttoMonat > 0 && werte.bruttoMonat <= SV.minijobGrenze;
  const kinderfreibetragMoeglich = werte.steuerklasse <= 4;

  return (
    <>
      <fieldset className="fieldset">
        <legend className="fieldset__legend">Einkommen</legend>

        <Segmented
          label="Angabe pro"
          value={zeitraum}
          onChange={setzeZeitraum}
          options={[
            { wert: 'monat', label: 'Monat' },
            { wert: 'jahr', label: 'Jahr' },
          ]}
        />

        <NumberField
          label={bruttoLabel}
          hint={bruttoHinweis ?? (zeitraum === 'jahr'
            ? `Entspricht ${num(werte.bruttoMonat)} € im Monat`
            : `Entspricht ${num(werte.bruttoMonat * 12)} € im Jahr`)}
          unit="€"
          min={0}
          dezimalstellen={2}
          // Bewusst ohne Zwischenrundung: Sonst würde aus einem eingegebenen
          // Jahresbetrag von 50.000 € beim Zurückrechnen 50.000,04 €.
          value={zeitraum === 'jahr' ? werte.bruttoMonat * 12 : werte.bruttoMonat}
          onChange={(wert) => patch({ bruttoMonat: zeitraum === 'jahr' ? wert / 12 : wert })}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Steuer</legend>

        <SelectField<Steuerklasse>
          label="Steuerklasse"
          hint={STEUERKLASSEN.find((s) => s.wert === werte.steuerklasse)?.beschreibung}
          value={werte.steuerklasse}
          onChange={(wert) => patch({
            steuerklasse: wert,
            ...(wert > 4 ? { kinderfreibetraege: 0 } : {}),
            ...(wert !== 4 ? { faktor: null } : {}),
          })}
          options={STEUERKLASSEN.map((s) => ({ wert: s.wert, label: `Klasse ${s.label}` }))}
        />

        <SelectField
          label="Bundesland"
          hint="Maßgeblich für den Kirchensteuersatz — und in Sachsen für die Pflegeversicherung."
          value={werte.bundesland}
          onChange={(wert) => patch({ bundesland: wert })}
          options={BUNDESLAENDER.map((b) => ({ wert: b.code, label: b.name }))}
        />

        <Switch
          label="Kirchensteuer"
          hint={`Mitglied einer steuererhebenden Religionsgemeinschaft${
            werte.kirchensteuer ? ` — hier ${num(
              (BUNDESLAENDER.find((b) => b.code === werte.bundesland)?.kirchensteuersatz ?? 0.09) * 100,
            )} % der Lohnsteuer` : ''}`}
          checked={werte.kirchensteuer}
          onChange={(wert) => patch({ kirchensteuer: wert })}
        />

        {kinderfreibetragMoeglich && (
          <NumberField
            label="Kinderfreibeträge"
            hint="Je Kind 1,0 — bei geteiltem Freibetrag 0,5. Senkt Solidaritätszuschlag und Kirchensteuer, nicht die Lohnsteuer."
            value={werte.kinderfreibetraege}
            onChange={(wert) => patch({ kinderfreibetraege: wert })}
            min={0}
            max={20}
          />
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Versicherung</legend>

        <Segmented
          label="Krankenversicherung"
          value={werte.kvTyp}
          onChange={(wert) => patch({ kvTyp: wert })}
          options={[
            { wert: 'gesetzlich', label: 'Gesetzlich' },
            { wert: 'privat', label: 'Privat' },
          ]}
        />

        {!privat && (
          <NumberField
            label="Zusatzbeitrag der Krankenkasse"
            hint={`Voller Satz; die Hälfte tragen Sie. Durchschnitt ${num(SV.kvZusatzbeitragDurchschnitt)} % für ${2026}.`}
            unit="%"
            value={werte.zusatzbeitrag}
            onChange={(wert) => patch({ zusatzbeitrag: wert })}
            min={0}
            max={10}
          />
        )}

        {privat && (
          <div className="grid-2">
            <NumberField
              label="Private KV"
              hint="Monatsbeitrag"
              unit="€"
              value={werte.pkvKrankenMonat}
              onChange={(wert) => patch({ pkvKrankenMonat: wert })}
              min={0}
              dezimalstellen={2}
            />
            <NumberField
              label="Private Pflege"
              hint="Monatsbeitrag"
              unit="€"
              value={werte.pkvPflegeMonat}
              onChange={(wert) => patch({ pkvPflegeMonat: wert })}
              min={0}
              dezimalstellen={2}
            />
          </div>
        )}

        <Switch
          label="Kinderlos"
          hint="Ab 23 Jahren kommen 0,6 Prozentpunkte Zuschlag zur Pflegeversicherung hinzu."
          checked={werte.kinderlos}
          onChange={(wert) => patch({ kinderlos: wert })}
        />

        {!werte.kinderlos && (
          <SelectField
            label="Kinder unter 25 Jahren"
            hint="Ab dem zweiten Kind sinkt der Pflegebeitrag um je 0,25 Prozentpunkte."
            value={werte.pvAbschlaege}
            onChange={(wert) => patch({ pvAbschlaege: wert })}
            options={[
              { wert: 0 as const, label: 'Ein Kind' },
              { wert: 1 as const, label: 'Zwei Kinder' },
              { wert: 2 as const, label: 'Drei Kinder' },
              { wert: 3 as const, label: 'Vier Kinder' },
              { wert: 4 as const, label: 'Fünf oder mehr' },
            ]}
          />
        )}
      </fieldset>

      <details className="disclosure">
        <summary>Weitere Angaben</summary>
        <div className="disclosure__body">
          {werte.steuerklasse === 4 && (
            <Field
              label="Steuerklasse IV mit Faktor"
              hint="Faktor aus dem Bescheid des Finanzamts, kleiner als 1. Leer lassen, wenn kein Faktorverfahren gewählt wurde."
              htmlFor="faktor-feld"
            >
              <div className="input-affix">
                <input
                  id="faktor-feld"
                  className="control"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="z. B. 0,912"
                  value={faktorText ?? (werte.faktor === null ? '' : zumBearbeiten(werte.faktor))}
                  onChange={(e) => {
                    setzeFaktorText(e.target.value);
                    const geparst = parseDezimal(e.target.value);
                    patch({ faktor: geparst !== null && geparst > 0 && geparst <= 1 ? geparst : null });
                  }}
                  onBlur={() => setzeFaktorText(null)}
                />
              </div>
            </Field>
          )}

          <NumberField
            label="Steuerfreibetrag"
            hint="Jahresbetrag aus einem Lohnsteuer-Ermäßigungsantrag."
            unit="€"
            value={werte.freibetragJahr}
            onChange={(wert) => patch({ freibetragJahr: wert })}
            min={0}
            dezimalstellen={2}
          />

          <NumberField
            label="Hinzurechnungsbetrag"
            hint="Jahresbetrag, falls in den Lohnsteuerabzugsmerkmalen eingetragen."
            unit="€"
            value={werte.hinzurechnungJahr}
            onChange={(wert) => patch({ hinzurechnungJahr: wert })}
            min={0}
            dezimalstellen={2}
          />

          <NumberField
            label="Geburtsjahr"
            hint="Nur für den Altersentlastungsbetrag nötig — relevant ab Geburtsjahr 1961 und früher. 0 bedeutet: keine Angabe."
            value={werte.geburtsjahr ?? 0}
            onChange={(wert) => patch({ geburtsjahr: wert > 1900 ? wert : null })}
            gruppiert={false}
            min={0}
            max={JAHR}
          />

          <Switch
            label="Rentenversicherungspflicht"
            hint="Abwählen z. B. bei berufsständischer Versorgung ohne gesetzliche Pflicht oder bei Beamten."
            checked={werte.rvPflicht}
            onChange={(wert) => patch({ rvPflicht: wert })}
          />

          <Switch
            label="Arbeitslosenversicherungspflicht"
            checked={werte.avPflicht}
            onChange={(wert) => patch({ avPflicht: wert })}
          />

          {minijob && (
            <Switch
              label="Befreiung von der Rentenversicherung"
              hint="Im Minijob auf Antrag möglich. Ohne Befreiung zahlen Sie 3,6 % Eigenanteil."
              checked={werte.minijobRvBefreiung}
              onChange={(wert) => patch({ minijobRvBefreiung: wert })}
            />
          )}

          {!werte.rvPflicht && (
            <Note>
              Ohne Rentenversicherungspflicht fällt auch die Vorsorgepauschale kleiner aus —
              die Lohnsteuer steigt dadurch.
            </Note>
          )}
        </div>
      </details>
    </>
  );
}
