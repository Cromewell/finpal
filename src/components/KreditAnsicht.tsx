import { berechneKredit, tilgungFuerLaufzeit, type KreditEingabe } from '../lib/kredit';
import { eur, eurRund, numFlex, prozent } from '../lib/format';
import { Card, Insight, Note } from './ui';
import { LinienDiagramm } from './LinienDiagramm';
import { VerteilungBalken } from './VerteilungBalken';

function laufzeitText(monate: number | null): string {
  if (monate === null) return 'nicht absehbar';
  const jahre = Math.floor(monate / 12);
  const rest = monate % 12;
  if (rest === 0) return `${jahre} Jahre`;
  return `${jahre} Jahre, ${rest} ${rest === 1 ? 'Monat' : 'Monate'}`;
}

export function KreditAnsicht({ eingabe }: { eingabe: KreditEingabe }) {
  const r = berechneKredit(eingabe);
  const bindungsJahre = Math.round(eingabe.zinsbindung);
  const noetigFuer20 = tilgungFuerLaufzeit(eingabe.darlehen, eingabe.sollzins, 20);

  const x = [0, ...r.jahre.map((j) => j.jahr)];
  const restschuld = [eingabe.darlehen, ...r.jahre.map((j) => j.restschuldEnde)];

  return (
    <>
      <section className="card">
        <div className="headline">
          <div className="headline__figure">
            <span className="headline__label">Monatsrate</span>
            <span className="headline__value">{eur(r.monatsrate)}</span>
            <span className="headline__sub">
              {eurRund(eingabe.darlehen)} zu {numFlex(eingabe.sollzins)} % mit{' '}
              {numFlex(r.anfangstilgung)} % Anfangstilgung — Laufzeit{' '}
              {laufzeitText(r.laufzeitMonate)}
            </span>
          </div>
          <div className="headline__side">
            <div className="mini">
              <span className="mini__label">Restschuld nach {bindungsJahre} Jahren</span>
              <span className="mini__value">{eurRund(r.restschuldNachBindung)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Zinsen gesamt</span>
              <span className="mini__value">{eurRund(r.zinsenGesamt)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Effektivzins</span>
              <span className="mini__value">{prozent(r.effektivzins, 2)}</span>
            </div>
          </div>
        </div>
      </section>

      {bindungsJahre > 0 && r.restschuldNachBindung > 0 && (
        <Insight title="Was am Ende der Zinsbindung übrig bleibt">
          Nach {bindungsJahre} Jahren haben Sie erst{' '}
          <strong>{prozent(r.getilgtBisBindung, 0)}</strong> des Darlehens getilgt. Offen bleiben{' '}
          <strong>{eurRund(r.restschuldNachBindung)}</strong>, die dann zu einem heute unbekannten
          Zins neu finanziert werden müssen. Bei{' '}
          {numFlex(eingabe.anschlusszins)} % Anschlusszins dauert es insgesamt{' '}
          {laufzeitText(r.laufzeitMonate)} bis zur Schuldenfreiheit.
        </Insight>
      )}

      <Card title="Wie die Restschuld sinkt" note="Zum Erkunden mit der Maus darüberfahren">
        <LinienDiagramm
          x={x}
          reihen={[{ name: 'Restschuld', farbe: 'var(--series-2)', werte: restschuld, flaeche: true }]}
          xBeschriftung="Jahre"
          formatX={(v) => `${numFlex(v)}`}
          formatAchse={(v) => eurRund(v).replace(' €', '')}
          formatWert={(v) => eur(v)}
          marken={bindungsJahre > 0 && bindungsJahre < x[x.length - 1]!
            ? [{ x: bindungsJahre, text: 'Zinsbindung', betont: true }]
            : []}
        />
      </Card>

      <Card title="Wofür Sie zahlen" note={`Über die gesamte Laufzeit: ${eurRund(r.zahlungenGesamt)}`}>
        <VerteilungBalken
          gesamt={r.zahlungenGesamt}
          segmente={[
            { name: 'Tilgung', wert: eingabe.darlehen, farbe: 'var(--series-1)' },
            { name: 'Zinsen', wert: r.zinsenGesamt, farbe: 'var(--series-2)' },
          ]}
        />
        <p className="field__hint" style={{ marginTop: 12 }}>
          Von jedem gezahlten Euro gehen{' '}
          {r.zahlungenGesamt > 0 ? prozent(r.zinsenGesamt / r.zahlungenGesamt) : '—'} an die Bank.
          Die Zinslast hängt vor allem an der Tilgung: Mit{' '}
          {numFlex(noetigFuer20)} % statt {numFlex(r.anfangstilgung)} % wären Sie in 20 Jahren
          schuldenfrei.
        </p>
      </Card>

      <Card title="Tilgungsplan" note="Jahreswerte, zugleich die Datentabelle zum Diagramm">
        <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Jahr</th>
                <th scope="col">Zins</th>
                <th scope="col">Zinssatz</th>
                <th scope="col">Tilgung</th>
                {r.summeSondertilgung > 0 && <th scope="col">Sondertilgung</th>}
                <th scope="col">Restschuld</th>
              </tr>
            </thead>
            <tbody>
              {r.jahre.map((j) => (
                <tr key={j.jahr} className={j.jahr === bindungsJahre ? 'row-highlight' : undefined}>
                  <td>
                    {j.jahr}
                    {j.jahr === bindungsJahre && (
                      <span className="cell-rate"> · Zinsbindung endet</span>
                    )}
                  </td>
                  <td>{eur(j.zins)}</td>
                  <td className="cell-rate">{numFlex(j.satz)} %</td>
                  <td>{eur(j.tilgung)}</td>
                  {r.summeSondertilgung > 0 && <td>{j.sondertilgung > 0 ? eur(j.sondertilgung) : '—'}</td>}
                  <td>{eur(j.restschuldEnde)}</td>
                </tr>
              ))}
              <tr className="row-sum">
                <td>Zusammen</td>
                <td>{eurRund(r.zinsenGesamt)}</td>
                <td className="cell-rate" />
                <td>{eurRund(eingabe.darlehen - r.summeSondertilgung)}</td>
                {r.summeSondertilgung > 0 && <td>{eurRund(r.summeSondertilgung)}</td>}
                <td>{eur(0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {r.hinweise.length > 0 && (
        <div className="notes">
          {r.hinweise.map((text) => (
            <Note key={text} art={r.laufzeitMonate === null ? 'warnung' : 'info'}>{text}</Note>
          ))}
        </div>
      )}

      <Note>
        Der effektive Jahreszins ergibt sich hier allein aus der monatlichen Verzinsung. Nebenkosten
        wie Disagio, Bearbeitungs- oder Schätzgebühren sind nicht enthalten und erhöhen ihn —
        maßgeblich ist der Effektivzins im Angebot Ihrer Bank. Ebenfalls nicht enthalten:
        Grunderwerbsteuer, Notar und Makler.
      </Note>
    </>
  );
}
