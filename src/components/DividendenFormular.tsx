import { ANLAGEARTEN, BUNDESLAENDER, KAPITAL, type Anlageart } from '../lib/constants';
import type { DividendenEingabe, Veranlagung } from '../lib/dividende';
import { sparerPauschbetrag } from '../lib/dividende';
import { eur, num } from '../lib/format';
import type { PayrollInput } from '../lib/payroll';
import { NumberField, Segmented, SelectField, Switch } from './ui';

interface Props {
  werte: DividendenEingabe;
  patch: (teil: Partial<DividendenEingabe>) => void;
  /** Bundesland und Kirchensteuer gelten für alle Rechner gemeinsam. */
  person: PayrollInput;
  patchPerson: (teil: Partial<PayrollInput>) => void;
  bruttoJahr: number;
}

export function DividendenFormular({ werte, patch, person, patchPerson, bruttoJahr }: Props) {
  const art = ANLAGEARTEN.find((a) => a.wert === werte.anlageart);
  const einzelaktien = werte.anlageart === 'aktien';
  const pauschbetrag = sparerPauschbetrag(werte.veranlagung);

  return (
    <>
      <fieldset className="fieldset">
        <legend className="fieldset__legend">Dividende</legend>

        <Segmented
          label="Woraus rechnen?"
          value={werte.eingabeart}
          onChange={(wert) => patch({ eingabeart: wert })}
          options={[
            { wert: 'portfolio', label: 'Depot & Rendite' },
            { wert: 'betrag', label: 'Betrag' },
          ]}
        />

        {werte.eingabeart === 'portfolio' ? (
          <>
            <NumberField
              label="Depotwert"
              unit="€"
              min={0}
              dezimalstellen={2}
              value={werte.portfolio}
              onChange={(wert) => patch({ portfolio: wert })}
            />
            <NumberField
              label="Dividendenrendite"
              hint={`Ergibt ${eur(bruttoJahr)} Bruttodividende im Jahr`}
              unit="%"
              min={0}
              max={30}
              value={werte.rendite}
              onChange={(wert) => patch({ rendite: wert })}
            />
          </>
        ) : (
          <NumberField
            label="Bruttodividende im Jahr"
            hint={`Entspricht ${eur(bruttoJahr / 12)} im Monat`}
            unit="€"
            min={0}
            dezimalstellen={2}
            value={werte.bruttoJahr}
            onChange={(wert) => patch({ bruttoJahr: wert })}
          />
        )}

        <SelectField<Anlageart>
          label="Anlageart"
          hint={art?.hinweis}
          value={werte.anlageart}
          onChange={(wert) => patch({ anlageart: wert })}
          options={ANLAGEARTEN.map((a) => ({ wert: a.wert, label: a.name }))}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Freibetrag</legend>

        <Segmented
          label="Veranlagung"
          hint={`Sparer-Pauschbetrag ${num(pauschbetrag)} € im Jahr`}
          value={werte.veranlagung}
          onChange={(wert: Veranlagung) => patch({ veranlagung: wert })}
          options={[
            { wert: 'einzeln', label: 'Einzeln', titel: '1.000 € Sparer-Pauschbetrag' },
            { wert: 'zusammen', label: 'Paar', titel: '2.000 € bei Zusammenveranlagung' },
          ]}
        />

        <NumberField
          label="Bereits verbraucht"
          hint="Was andere Kapitalerträge im selben Jahr schon vom Pauschbetrag aufgezehrt haben — Zinsen, Kursgewinne, andere Depots."
          unit="€"
          min={0}
          max={pauschbetrag}
          dezimalstellen={2}
          value={werte.pauschbetragVerbraucht}
          onChange={(wert) => patch({ pauschbetragVerbraucht: wert })}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Kirchensteuer</legend>

        <Switch
          label="Kirchensteuerpflichtig"
          hint="Die Kirchensteuer mindert als Sonderausgabe die Kapitalertragsteuer selbst — der Aufschlag fällt daher kleiner aus, als oft gerechnet wird."
          checked={person.kirchensteuer}
          onChange={(wert) => patchPerson({ kirchensteuer: wert })}
        />

        {person.kirchensteuer && (
          <SelectField
            label="Bundesland"
            hint="8 % in Bayern und Baden-Württemberg, sonst 9 %."
            value={person.bundesland}
            onChange={(wert) => patchPerson({ bundesland: wert })}
            options={BUNDESLAENDER.map((b) => ({ wert: b.code, label: b.name }))}
          />
        )}
      </fieldset>

      {einzelaktien && (
        <details className="disclosure">
          <summary>Ausländische Quellensteuer</summary>
          <div className="disclosure__body">
            <NumberField
              label="Im Ausland einbehalten"
              hint="Zum Beispiel 15 % für US-Aktien mit gültigem W-8BEN, 35 % für Schweizer Papiere. Bei 0 % bleibt es bei der deutschen Besteuerung."
              unit="%"
              min={0}
              max={50}
              value={werte.quellensteuerProzent}
              onChange={(wert) => patch({ quellensteuerProzent: wert })}
            />
            <NumberField
              label="Davon anrechenbar"
              hint={`Höchstsatz nach Doppelbesteuerungsabkommen — meist ${KAPITAL.quellensteuerAnrechnungStandard} %.`}
              unit="%"
              min={0}
              max={50}
              value={werte.anrechnungshoechstsatz}
              onChange={(wert) => patch({ anrechnungshoechstsatz: wert })}
            />
          </div>
        </details>
      )}
    </>
  );
}
