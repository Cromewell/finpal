import { ANLAGEARTEN, type Anlageart } from '../lib/constants';
import type { EntnahmeEingabe } from '../lib/entnahme';
import type { Veranlagung } from '../lib/dividende';
import { eur, prozent } from '../lib/format';
import { NumberField, Note, Segmented, SelectField } from './ui';

export function EntnahmeFormular({
  werte, patch,
}: {
  werte: EntnahmeEingabe;
  patch: (teil: Partial<EntnahmeEingabe>) => void;
}) {
  const gewinnanteil = werte.startkapital > 0
    ? Math.max(0, 1 - Math.min(werte.einstandswert, werte.startkapital) / werte.startkapital)
    : 0;

  return (
    <>
      <fieldset className="fieldset">
        <legend className="fieldset__legend">Depot</legend>

        <NumberField
          label="Heutiger Depotwert"
          unit="€"
          min={0}
          dezimalstellen={2}
          value={werte.startkapital}
          onChange={(wert) => patch({ startkapital: wert })}
        />

        <NumberField
          label="Einstandswert"
          hint={`Was Sie ursprünglich eingezahlt haben. Daraus ergibt sich der Gewinnanteil von ${prozent(gewinnanteil)} — nur dieser Teil wird beim Verkauf besteuert.`}
          unit="€"
          min={0}
          dezimalstellen={2}
          value={werte.einstandswert}
          onChange={(wert) => patch({ einstandswert: wert })}
        />

        <SelectField<Anlageart>
          label="Anlageart"
          hint={ANLAGEARTEN.find((a) => a.wert === werte.anlageart)?.hinweis}
          value={werte.anlageart}
          onChange={(wert) => patch({ anlageart: wert })}
          options={ANLAGEARTEN.map((a) => ({ wert: a.wert, label: a.name }))}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Entnahme</legend>

        <NumberField
          label="Gewünschte Entnahme"
          hint={`Pro Monat, nach Steuern — also das, was auf dem Konto ankommt. ${eur(werte.entnahmeNettoMonat * 12)} im Jahr.`}
          unit="€"
          min={0}
          dezimalstellen={2}
          value={werte.entnahmeNettoMonat}
          onChange={(wert) => patch({ entnahmeNettoMonat: wert })}
        />

        <div className="grid-2">
          <NumberField
            label="Rendite"
            hint="pro Jahr"
            unit="%"
            min={0}
            max={20}
            value={werte.rendite}
            onChange={(wert) => patch({ rendite: wert })}
          />
          <NumberField
            label="Inflation"
            hint="hebt die Entnahme"
            unit="%"
            min={0}
            max={15}
            value={werte.inflation}
            onChange={(wert) => patch({ inflation: wert })}
          />
        </div>

        <NumberField
          label="Betrachtungszeitraum"
          hint="Über wie viele Jahre soll das Depot tragen?"
          unit="Jahre"
          min={1}
          max={60}
          value={werte.dauerJahre}
          onChange={(wert) => patch({ dauerJahre: wert })}
        />

        {werte.inflation === 0 && (
          <Note>
            Ohne Inflationsanpassung bleibt die Entnahme nominal gleich — ihre Kaufkraft sinkt
            dann Jahr für Jahr. Für eine ehrliche Planung sind 2 % ein üblicher Ansatz.
          </Note>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Freibetrag</legend>

        <Segmented
          label="Veranlagung"
          hint={`Sparer-Pauschbetrag ${werte.veranlagung === 'zusammen' ? '2.000' : '1.000'} € im Jahr — er mindert die Steuer auf den realisierten Gewinn.`}
          value={werte.veranlagung}
          onChange={(wert: Veranlagung) => patch({ veranlagung: wert })}
          options={[
            { wert: 'einzeln', label: 'Einzeln' },
            { wert: 'zusammen', label: 'Paar' },
          ]}
        />
        <p className="field__hint">
          Kirchensteuer und Bundesland übernimmt der Rechner aus Ihren übrigen Angaben.
        </p>
      </fieldset>
    </>
  );
}
