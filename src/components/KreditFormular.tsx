import { annuitaet, type KreditEingabe, type Tilgungsart } from '../lib/kredit';
import { eur, numFlex } from '../lib/format';
import { NumberField, Note, Segmented } from './ui';

export function KreditFormular({
  werte, patch,
}: {
  werte: KreditEingabe;
  patch: (teil: Partial<KreditEingabe>) => void;
}) {
  const rate = werte.tilgungsart === 'rate'
    ? werte.rate
    : annuitaet(werte.darlehen, werte.sollzins, werte.anfangstilgung);

  return (
    <>
      <fieldset className="fieldset">
        <legend className="fieldset__legend">Darlehen</legend>

        <NumberField
          label="Darlehensbetrag"
          unit="€"
          min={0}
          dezimalstellen={2}
          value={werte.darlehen}
          onChange={(wert) => patch({ darlehen: wert })}
        />

        <NumberField
          label="Sollzins"
          hint={`Nominal pro Jahr — ergibt ${eur(rate)} Monatsrate`}
          unit="%"
          min={0}
          max={20}
          value={werte.sollzins}
          onChange={(wert) => patch({ sollzins: wert })}
        />

        <Segmented
          label="Rate festlegen über"
          value={werte.tilgungsart}
          onChange={(wert: Tilgungsart) => patch({ tilgungsart: wert })}
          options={[
            { wert: 'tilgungssatz', label: 'Tilgungssatz', titel: 'Anfängliche Tilgung in Prozent pro Jahr' },
            { wert: 'rate', label: 'Monatsrate', titel: 'Monatsrate direkt vorgeben' },
          ]}
        />

        {werte.tilgungsart === 'tilgungssatz' ? (
          <NumberField
            label="Anfängliche Tilgung"
            hint="Üblich sind 2 bis 3 %. Je höher, desto schneller sind Sie schuldenfrei."
            unit="%"
            min={0}
            max={20}
            value={werte.anfangstilgung}
            onChange={(wert) => patch({ anfangstilgung: wert })}
          />
        ) : (
          <NumberField
            label="Monatsrate"
            unit="€"
            min={0}
            dezimalstellen={2}
            value={werte.rate}
            onChange={(wert) => patch({ rate: wert })}
          />
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Zinsbindung</legend>

        <NumberField
          label="Dauer der Zinsbindung"
          hint="So lange gilt der vereinbarte Sollzins fest."
          unit="Jahre"
          min={0}
          max={40}
          value={werte.zinsbindung}
          onChange={(wert) => patch({ zinsbindung: wert })}
        />

        <NumberField
          label="Angenommener Anschlusszins"
          hint="Der Zins nach Ablauf der Bindung ist heute unbekannt — hier können Sie durchspielen, was er bedeutet."
          unit="%"
          min={0}
          max={20}
          value={werte.anschlusszins}
          onChange={(wert) => patch({ anschlusszins: wert })}
        />

        <NumberField
          label="Jährliche Sondertilgung"
          hint="Viele Verträge erlauben bis zu 5 % der Darlehenssumme pro Jahr ohne Aufschlag."
          unit="€"
          min={0}
          dezimalstellen={2}
          value={werte.sondertilgung}
          onChange={(wert) => patch({ sondertilgung: wert })}
        />

        {werte.zinsbindung > 0 && werte.anschlusszins > werte.sollzins + 2 && (
          <Note>
            Sie rechnen mit einem deutlich höheren Anschlusszins —{' '}
            {numFlex(werte.anschlusszins - werte.sollzins)} Punkte über dem heutigen. Das ist ein
            sinnvoller Härtetest: So sehen Sie, ob die Finanzierung auch dann noch trägt.
          </Note>
        )}
      </fieldset>
    </>
  );
}
