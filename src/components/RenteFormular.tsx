import { RENTE, SV, regelaltersgrenze } from '../lib/constants';
import type { RenteEingabe } from '../lib/rente';
import { entgeltpunkteFuer } from '../lib/rente';
import { BUNDESLAENDER } from '../lib/constants';
import { num, numFlex } from '../lib/format';
import type { PayrollInput } from '../lib/payroll';
import { NumberField, Note, SelectField, Switch } from './ui';

export function RenteFormular({
  werte, patch, person, patchPerson,
}: {
  werte: RenteEingabe;
  patch: (teil: Partial<RenteEingabe>) => void;
  person: PayrollInput;
  patchPerson: (teil: Partial<PayrollInput>) => void;
}) {
  const grenze = regelaltersgrenze(werte.geburtsjahr);
  const proJahr = entgeltpunkteFuer(werte.bruttoJahr);

  return (
    <>
      <fieldset className="fieldset">
        <legend className="fieldset__legend">Ihre Erwerbsbiografie</legend>

        <NumberField
          label="Geburtsjahr"
          hint={`Regelaltersgrenze ${Math.floor(grenze)} Jahre${
            grenze % 1 > 0 ? ` und ${Math.round((grenze % 1) * 12)} Monate` : ''
          } — Rentenbeginn ${Math.round(werte.geburtsjahr + grenze)}`}
          gruppiert={false}
          min={1940}
          max={2010}
          value={werte.geburtsjahr}
          onChange={(wert) => patch({ geburtsjahr: wert })}
        />

        <NumberField
          label="Heutiges Bruttogehalt"
          hint={`Pro Jahr — bringt ${num(proJahr)} Entgeltpunkte jährlich. Ein Durchschnittsverdiener mit ${num(RENTE.durchschnittsentgelt)} € erhält genau einen.`}
          unit="€"
          min={0}
          dezimalstellen={2}
          value={werte.bruttoJahr}
          onChange={(wert) => patch({ bruttoJahr: wert })}
        />

        <NumberField
          label="Bisherige Entgeltpunkte"
          hint="Steht in Ihrer Renteninformation der Deutschen Rentenversicherung. Grobe Schätzung: erworbene Jahre mal durchschnittliche Punkte pro Jahr."
          min={0}
          max={100}
          value={werte.entgeltpunkteBisher}
          onChange={(wert) => patch({ entgeltpunkteBisher: wert })}
        />

        {werte.bruttoJahr > SV.bbgRvAvJahr && (
          <Note>
            Ihr Gehalt liegt über der Beitragsbemessungsgrenze von{' '}
            {num(SV.bbgRvAvJahr)} €. Darüber hinaus entstehen keine weiteren Entgeltpunkte.
          </Note>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Annahmen</legend>

        <div className="grid-2">
          <NumberField
            label="Rentenanpassung"
            hint="pro Jahr"
            unit="%"
            min={0}
            max={10}
            value={werte.rentenanpassung}
            onChange={(wert) => patch({ rentenanpassung: wert })}
          />
          <NumberField
            label="Inflation"
            hint="pro Jahr"
            unit="%"
            min={0}
            max={10}
            value={werte.inflation}
            onChange={(wert) => patch({ inflation: wert })}
          />
        </div>

        <NumberField
          label="Gewünschtes Netto im Ruhestand"
          hint="Pro Monat, in heutiger Kaufkraft — der Rechner rechnet es auf das Rentenjahr hoch."
          unit="€"
          min={0}
          dezimalstellen={2}
          value={werte.wunschNettoHeute}
          onChange={(wert) => patch({ wunschNettoHeute: wert })}
        />

        {werte.rentenanpassung < werte.inflation && (
          <Note>
            Sie rechnen damit, dass die Renten langsamer steigen als die Preise —{' '}
            {numFlex(werte.inflation - werte.rentenanpassung)} Punkte Unterschied. Die Kaufkraft
            Ihrer Rente sinkt dann über die Jahre.
          </Note>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Beiträge und Kirchensteuer</legend>

        <NumberField
          label="Zusatzbeitrag der Krankenkasse"
          hint={`Voller Satz; auf die Rente tragen Sie die Hälfte. Durchschnitt ${num(SV.kvZusatzbeitragDurchschnitt)} %.`}
          unit="%"
          min={0}
          max={10}
          value={werte.zusatzbeitrag}
          onChange={(wert) => patch({ zusatzbeitrag: wert })}
        />

        <Switch
          label="Kinderlos"
          hint="Als kinderlose Person zahlen Sie 0,6 Punkte mehr zur Pflegeversicherung — die Rentner ohnehin allein tragen."
          checked={werte.kinderlos}
          onChange={(wert) => patch({ kinderlos: wert })}
        />

        <Switch
          label="Kirchensteuerpflichtig"
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
    </>
  );
}
