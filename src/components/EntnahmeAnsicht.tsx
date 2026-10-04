import {
  berechneEntnahme, startkapitalFuer,
  type EntnahmeEingabe, type SteuerlicheLage,
} from '../lib/entnahme';
import { eur, eurRund, numFlex, prozent } from '../lib/format';
import { Card, Insight, Note } from './ui';
import { LinienDiagramm } from './LinienDiagramm';

export function EntnahmeAnsicht({
  eingabe, lage,
}: {
  eingabe: EntnahmeEingabe;
  lage: SteuerlicheLage;
}) {
  const r = berechneEntnahme(eingabe, lage);
  const noetig = startkapitalFuer(eingabe, lage);
  const reichweiteJahre = r.reichweiteMonate !== null ? Math.round(r.reichweiteMonate / 12) : null;

  const x = [0, ...r.jahre.map((j) => j.jahr)];
  const kapital = [eingabe.startkapital, ...r.jahre.map((j) => j.kapitalEnde)];

  return (
    <>
      <section className="card">
        <div className="headline">
          <div className="headline__figure">
            <span className="headline__label">
              {r.traegtDurch ? 'Das Depot trägt durch' : 'Das Kapital reicht'}
            </span>
            <span className="headline__value">
              {r.traegtDurch ? `${eingabe.dauerJahre} Jahre` : `${reichweiteJahre ?? 0} Jahre`}
            </span>
            <span className="headline__sub">
              bei {eur(eingabe.entnahmeNettoMonat)} netto im Monat
              {eingabe.inflation > 0 && `, jährlich um ${numFlex(eingabe.inflation)} % angehoben`}
              {r.traegtDurch && r.kapitalAmEnde > 0 && ` — am Ende bleiben ${eurRund(r.kapitalAmEnde)}`}
            </span>
          </div>
          <div className="headline__side">
            <div className="mini">
              <span className="mini__label">Entnommen gesamt</span>
              <span className="mini__value">{eurRund(r.entnahmeNettoGesamt)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Steuern gesamt</span>
              <span className="mini__value">{eurRund(r.steuernGesamt)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Steuerquote</span>
              <span className="mini__value">{prozent(r.effektiveSteuerquote)}</span>
            </div>
          </div>
        </div>
      </section>

      <Card title="Wie das Kapital sich entwickelt" note="Zum Erkunden mit der Maus darüberfahren">
        <LinienDiagramm
          x={x}
          reihen={[{ name: 'Depotwert', farbe: 'var(--series-1)', werte: kapital, flaeche: true }]}
          xBeschriftung="Jahre"
          formatX={(v) => numFlex(v)}
          formatAchse={(v) => eurRund(v).replace(' €', '')}
          formatWert={(v) => eur(v)}
          marken={!r.traegtDurch && reichweiteJahre !== null
            ? [{ x: reichweiteJahre, text: 'aufgebraucht', betont: true }]
            : []}
        />
      </Card>

      <Insight title="Benötigtes Startkapital">
        Damit {eur(eingabe.entnahmeNettoMonat)} netto im Monat über{' '}
        {eingabe.dauerJahre} Jahre tragen, brauchen Sie bei{' '}
        {numFlex(eingabe.rendite)} % Rendite ein Depot von etwa{' '}
        <strong>{eurRund(noetig)}</strong>
        {eingabe.startkapital > 0 && (
          <>
            {' '}— Sie haben {eurRund(eingabe.startkapital)}, also{' '}
            {noetig > eingabe.startkapital
              ? `${eurRund(noetig - eingabe.startkapital)} zu wenig`
              : `${eurRund(eingabe.startkapital - noetig)} mehr als nötig`}
          </>
        )}.
      </Insight>

      <Card title="Jahr für Jahr" note="Zugleich die Datentabelle zum Diagramm">
        <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Jahr</th>
                <th scope="col">Kapital am Anfang</th>
                <th scope="col">Entnahme brutto</th>
                <th scope="col">Steuern</th>
                <th scope="col">Entnahme netto</th>
                <th scope="col">Gewinnanteil</th>
                <th scope="col">Kapital am Ende</th>
              </tr>
            </thead>
            <tbody>
              {r.jahre.map((j) => (
                <tr key={j.jahr}>
                  <td>{j.jahr}</td>
                  <td>{eurRund(j.kapitalAnfang)}</td>
                  <td>{eur(j.entnahmeBrutto)}</td>
                  <td>{j.steuern > 0 ? eur(j.steuern) : '—'}</td>
                  <td>{eur(j.entnahmeNetto)}</td>
                  <td className="cell-rate">{prozent(j.gewinnanteil, 0)}</td>
                  <td>{eurRund(j.kapitalEnde)}</td>
                </tr>
              ))}
              <tr className="row-sum">
                <td>Zusammen</td>
                <td />
                <td>{eurRund(r.entnahmeBruttoGesamt)}</td>
                <td>{eurRund(r.steuernGesamt)}</td>
                <td>{eurRund(r.entnahmeNettoGesamt)}</td>
                <td className="cell-rate" />
                <td>{eurRund(r.kapitalAmEnde)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="field__hint" style={{ marginTop: 12 }}>
          Die Bruttoentnahme ist das, was aus dem Depot verkauft wird; netto bleibt davon nach
          Abzug der Abgeltungsteuer auf den enthaltenen Gewinn. Der Gewinnanteil zeigt, wie viel
          des Depots über dem Einstandswert liegt — er wächst mit den Jahren und damit auch die
          Steuer.
        </p>
      </Card>

      {r.hinweise.length > 0 && (
        <div className="notes">
          {r.hinweise.map((text) => (
            <Note key={text} art={text.includes('aufgebraucht') ? 'warnung' : 'info'}>{text}</Note>
          ))}
        </div>
      )}

      <Note>
        Nicht enthalten: die Vorabpauschale bei thesaurierenden Fonds, Verlustverrechnungstöpfe und
        Transaktionskosten. Verkauft wird hier anteilig über das ganze Depot; in der Praxis greift
        beim Verkauf das Verbrauchsfolgeverfahren, bei dem zuerst die ältesten Anteile veräußert
        werden.
      </Note>
    </>
  );
}
