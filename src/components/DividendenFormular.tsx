import { ANLAGEARTEN, BUNDESLAENDER, KAPITAL, type Anlageart } from '../lib/constants';
import {
  anteilSumme, sparerPauschbetrag,
  type Depotposition, type DividendenEingabe, type Veranlagung,
} from '../lib/dividende';
import { eur, eurRund, num, numFlex } from '../lib/format';
import { neueId } from '../lib/id';
import type { PayrollInput } from '../lib/payroll';
import { IconPlus, IconTrash, NumberField, Note, Segmented, SelectField, Switch } from './ui';

interface Props {
  werte: DividendenEingabe;
  patch: (teil: Partial<DividendenEingabe>) => void;
  /** Bundesland und Kirchensteuer gelten für alle Rechner gemeinsam. */
  person: PayrollInput;
  patchPerson: (teil: Partial<PayrollInput>) => void;
  bruttoJahr: number;
}

/** Eine Depotposition — Anteil, Rendite und Anlageart. */
function PositionsKarte({
  position, depotwert, loeschbar, onAendern, onLoeschen,
}: {
  position: Depotposition;
  depotwert: number;
  loeschbar: boolean;
  onAendern: (teil: Partial<Depotposition>) => void;
  onLoeschen: () => void;
}) {
  const brutto = depotwert * (Math.max(0, position.rendite) / 100);
  const einzelaktien = position.anlageart === 'aktien';
  const art = ANLAGEARTEN.find((a) => a.wert === position.anlageart);

  return (
    <div className="gruppe">
      <div className="posten posten--kopf">
        <input
          className="control posten__name"
          type="text"
          value={position.name}
          placeholder="z. B. Aktien-ETF"
          aria-label="Bezeichnung der Position"
          onChange={(e) => onAendern({ name: e.target.value })}
        />
        {loeschbar && (
          <button
            type="button"
            className="posten__weg"
            aria-label={`Position „${position.name}“ entfernen`}
            title={`Position „${position.name}“ entfernen`}
            onClick={onLoeschen}
          >
            <IconTrash />
          </button>
        )}
      </div>

      <div className="grid-2">
        <NumberField
          label="Anteil"
          unit="%"
          min={0}
          max={100}
          value={position.anteil}
          onChange={(wert) => onAendern({ anteil: wert })}
        />
        <NumberField
          label="Rendite"
          unit="%"
          min={0}
          max={30}
          value={position.rendite}
          onChange={(wert) => onAendern({ rendite: wert })}
        />
      </div>

      <SelectField<Anlageart>
        label="Anlageart"
        value={position.anlageart}
        onChange={(wert) => onAendern({ anlageart: wert })}
        options={ANLAGEARTEN.map((a) => ({ wert: a.wert, label: a.name }))}
      />

      {einzelaktien && (
        <NumberField
          label="Ausländische Quellensteuer"
          hint="Zum Beispiel 15 % für US-Aktien mit W-8BEN, 35 % für Schweizer Papiere."
          unit="%"
          min={0}
          max={50}
          value={position.quellensteuerProzent}
          onChange={(wert) => onAendern({ quellensteuerProzent: wert })}
        />
      )}

      <p className="gruppe__summe">
        {eurRund(depotwert)} im Depot · <strong>{eur(brutto)}</strong> Dividende im Jahr
        {art && art.teilfreistellung > 0 && (
          <> · {numFlex(art.teilfreistellung * 100)} % teilfreigestellt</>
        )}
      </p>
    </div>
  );
}

export function DividendenFormular({ werte, patch, person, patchPerson, bruttoJahr }: Props) {
  const pauschbetrag = sparerPauschbetrag(werte.veranlagung);
  const summe = anteilSumme(werte.positionen);
  const depotModus = werte.eingabeart === 'portfolio';
  const betragsArt = ANLAGEARTEN.find((a) => a.wert === werte.anlageart);

  const aendere = (id: string, teil: Partial<Depotposition>) =>
    patch({ positionen: werte.positionen.map((p) => (p.id === id ? { ...p, ...teil } : p)) });

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

        {depotModus ? (
          <>
            <NumberField
              label="Depotwert"
              hint={`Ergibt ${eur(bruttoJahr)} Bruttodividende im Jahr`}
              unit="€"
              min={0}
              dezimalstellen={2}
              value={werte.portfolio}
              onChange={(wert) => patch({ portfolio: wert })}
            />

            <div className="posten-liste">
              {werte.positionen.map((p) => (
                <PositionsKarte
                  key={p.id}
                  position={p}
                  depotwert={Math.max(0, werte.portfolio) * (Math.max(0, p.anteil) / 100)}
                  loeschbar={werte.positionen.length > 1}
                  onAendern={(teil) => aendere(p.id, teil)}
                  onLoeschen={() => patch({
                    positionen: werte.positionen.filter((x) => x.id !== p.id),
                  })}
                />
              ))}
            </div>

            <div className="toolbar">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => patch({
                  positionen: [
                    ...werte.positionen,
                    {
                      id: neueId('p'),
                      name: '',
                      // Was zu 100 % fehlt, als Vorschlag übernehmen.
                      anteil: Math.max(0, Math.round((100 - summe) * 100) / 100),
                      rendite: 3,
                      anlageart: 'aktien',
                      quellensteuerProzent: 0,
                    },
                  ],
                })}
              >
                <IconPlus />Position
              </button>
              <span className={`anteil-summe${Math.abs(summe - 100) > 0.01 ? ' is-abweichend' : ''}`}>
                Anteile zusammen {numFlex(summe)} %
              </span>
            </div>

            {Math.abs(summe - 100) > 0.01 && (
              <Note art={summe > 100 ? 'warnung' : 'info'}>
                {summe > 100
                  ? 'Die Anteile ergeben mehr als das ganze Depot.'
                  : `Die fehlenden ${numFlex(Math.round((100 - summe) * 100) / 100)} % bringen in dieser Rechnung keine Dividende — passend für Anleihen, Gold oder Tagesgeld.`}
              </Note>
            )}
          </>
        ) : (
          <>
            <NumberField
              label="Bruttodividende im Jahr"
              hint={`Entspricht ${eur(bruttoJahr / 12)} im Monat`}
              unit="€"
              min={0}
              dezimalstellen={2}
              value={werte.bruttoJahr}
              onChange={(wert) => patch({ bruttoJahr: wert })}
            />
            <SelectField<Anlageart>
              label="Anlageart"
              hint={betragsArt?.hinweis}
              value={werte.anlageart}
              onChange={(wert) => patch({ anlageart: wert })}
              options={ANLAGEARTEN.map((a) => ({ wert: a.wert, label: a.name }))}
            />
            {werte.anlageart === 'aktien' && (
              <NumberField
                label="Ausländische Quellensteuer"
                hint="Zum Beispiel 15 % für US-Aktien mit W-8BEN."
                unit="%"
                min={0}
                max={50}
                value={werte.quellensteuerProzent}
                onChange={(wert) => patch({ quellensteuerProzent: wert })}
              />
            )}
          </>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Freibetrag</legend>

        <Segmented
          label="Veranlagung"
          hint={`Sparer-Pauschbetrag ${num(pauschbetrag)} € im Jahr — er gilt einmal für alle Positionen zusammen.`}
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

      <details className="disclosure">
        <summary>Anrechnung ausländischer Steuer</summary>
        <div className="disclosure__body">
          <NumberField
            label="Anrechenbarer Höchstsatz"
            hint={`Nach Doppelbesteuerungsabkommen meist ${KAPITAL.quellensteuerAnrechnungStandard} %. Was darüber einbehalten wird, müssen Sie im Quellenstaat zurückfordern.`}
            unit="%"
            min={0}
            max={50}
            value={werte.anrechnungshoechstsatz}
            onChange={(wert) => patch({ anrechnungshoechstsatz: wert })}
          />
        </div>
      </details>
    </>
  );
}
