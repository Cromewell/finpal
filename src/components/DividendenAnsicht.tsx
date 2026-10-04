import { useState } from 'react';
import { ANLAGEART_MAP, KAPITAL } from '../lib/constants';
import {
  berechneDividende, portfolioFuerNetto,
  type DividendenEingabe, type SteuerlicheLage,
} from '../lib/dividende';
import { eur, eurRund, num, numFlex, prozent } from '../lib/format';
import { Card, Insight, NumberField, Note } from './ui';
import { VerteilungBalken } from './VerteilungBalken';

/** Depotgrößen für die Übersicht am Ende. */
const STUFEN = [25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];

export function DividendenAnsicht({
  eingabe, lage,
}: {
  eingabe: DividendenEingabe;
  lage: SteuerlicheLage;
}) {
  const [zielNetto, setzeZielNetto] = useState(1_000);
  const r = berechneDividende(eingabe, lage);
  const noetigesDepot = portfolioFuerNetto(zielNetto, eingabe, lage);
  const weitereSteuern = r.soli + r.kirchensteuer + r.quellensteuer;

  return (
    <>
      <section className="card">
        <div className="headline">
          <div className="headline__figure">
            <span className="headline__label">Netto im Monat, im Schnitt</span>
            <span className="headline__value">{eur(r.nettoMonat)}</span>
            <span className="headline__sub">
              aus {eur(r.bruttoJahr)} Bruttodividende im Jahr —{' '}
              {r.steuernGesamt > 0
                ? `${prozent(r.effektiverSteuersatz)} gehen an den Fiskus`
                : 'steuerfrei dank Sparer-Pauschbetrag'}
            </span>
          </div>
          <div className="headline__side">
            <div className="mini">
              <span className="mini__label">Netto im Jahr</span>
              <span className="mini__value">{eur(r.nettoJahr)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Steuern</span>
              <span className="mini__value">{eur(r.steuernGesamt)}</span>
            </div>
            {r.nettoRendite !== null && (
              <div className="mini">
                <span className="mini__label">Rendite nach Steuern</span>
                <span className="mini__value">{prozent(r.nettoRendite, 2)}</span>
              </div>
            )}
            {r.mischrendite !== null && r.positionen.length > 1 && (
              <div className="mini">
                <span className="mini__label">Mischrendite brutto</span>
                <span className="mini__value">{numFlex(r.mischrendite)} %</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <Card title="Wohin die Dividende geht" note={`Jährlich, ${eur(r.bruttoJahr)} brutto`}>
        <VerteilungBalken
          gesamt={r.bruttoJahr}
          segmente={[
            { name: 'Netto', wert: r.nettoJahr, farbe: 'var(--series-1)' },
            { name: 'Kapitalertragsteuer', wert: r.kapitalertragsteuer, farbe: 'var(--series-2)' },
            { name: 'Soli, Kirche & Ausland', wert: weitereSteuern, farbe: 'var(--series-3)' },
          ]}
        />
      </Card>

      {r.positionen.length > 1 && (
        <Card
          title="Das Depot nach Positionen"
          note={`Anteile zusammen ${numFlex(r.anteilSumme)} %`}
        >
          <div className="table-scroll">
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Position</th>
                  <th scope="col">Anteil</th>
                  <th scope="col">Depotwert</th>
                  <th scope="col">Rendite</th>
                  <th scope="col">Brutto / Jahr</th>
                  <th scope="col">Teilfreistellung</th>
                  <th scope="col">Steuerpflichtig</th>
                </tr>
              </thead>
              <tbody>
                {r.positionen.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="swatch-cell">
                        <span className="swatch" style={{ background: 'var(--series-2)' }} />
                        {p.name || ANLAGEART_MAP[p.anlageart].name}
                      </span>
                    </td>
                    <td>{numFlex(p.anteil)} %</td>
                    <td>{p.depotwert === null ? '—' : eurRund(p.depotwert)}</td>
                    <td>{p.rendite === null ? '—' : `${numFlex(p.rendite)} %`}</td>
                    <td>{eur(p.bruttoJahr)}</td>
                    <td className="cell-rate">
                      {p.teilfreistellungssatz > 0
                        ? `${prozent(p.teilfreistellungssatz, 0)} · −${eur(p.teilfreigestellt)}`
                        : '—'}
                    </td>
                    <td>{eur(p.steuerpflichtig)}</td>
                  </tr>
                ))}
                <tr className="row-sum">
                  <td>Zusammen</td>
                  <td>{numFlex(r.anteilSumme)} %</td>
                  <td>{r.portfolio === null ? '—' : eurRund(r.portfolio)}</td>
                  <td>{r.mischrendite === null ? '—' : `${numFlex(r.mischrendite)} %`}</td>
                  <td>{eur(r.bruttoJahr)}</td>
                  <td className="cell-rate">−{eur(r.teilfreigestellt)}</td>
                  <td>{eur(r.ertragSteuerpflichtig)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="field__hint" style={{ marginTop: 12 }}>
            Teilfreistellung und ausländische Quellensteuer gelten je Position. Der
            Sparer-Pauschbetrag dagegen nur einmal für alles zusammen — deshalb wird er erst
            von der Summe abgezogen.
          </p>
        </Card>
      )}

      <Card title="Der Weg von brutto zu netto">
        <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Schritt</th>
                <th scope="col">Satz</th>
                <th scope="col">Jahr</th>
                <th scope="col">Monat</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bruttodividende</td>
                <td className="cell-rate">
                  {r.portfolio && r.mischrendite !== null
                    ? `${numFlex(r.mischrendite)} % auf ${eurRund(r.portfolio)}`
                    : ''}
                </td>
                <td>{eur(r.bruttoJahr)}</td>
                <td>{eur(r.bruttoMonat)}</td>
              </tr>

              {r.teilfreistellungssatz > 0 && (
                <tr>
                  <td>abzüglich Teilfreistellung</td>
                  <td className="cell-rate">
                    {prozent(r.teilfreistellungssatz, 1)}
                    {r.positionen.length === 1 ? ` · ${r.positionen[0]!.name}` : ' über alle Positionen'}
                  </td>
                  <td>−{eur(r.teilfreigestellt)}</td>
                  <td>−{eur(r.teilfreigestellt / 12)}</td>
                </tr>
              )}

              <tr>
                <td>abzüglich Sparer-Pauschbetrag</td>
                <td className="cell-rate">
                  {r.pauschbetragRest > 0
                    ? `noch ${eur(r.pauschbetragRest)} frei`
                    : `${eur(r.pauschbetrag)} ausgeschöpft`}
                </td>
                <td>−{eur(r.pauschbetragGenutzt)}</td>
                <td>−{eur(r.pauschbetragGenutzt / 12)}</td>
              </tr>

              <tr className="row-sum">
                <td>Steuerpflichtiger Betrag</td>
                <td className="cell-rate" />
                <td>{eur(r.bemessungsgrundlage)}</td>
                <td>{eur(r.bemessungsgrundlage / 12)}</td>
              </tr>

              <tr className="row-group"><td colSpan={4}>Steuern</td></tr>

              {r.quellensteuer > 0 && (
                <tr>
                  <td>
                    <span className="swatch-cell">
                      <span className="swatch" style={{ background: 'var(--series-3)' }} />
                      Ausländische Quellensteuer
                    </span>
                  </td>
                  <td className="cell-rate">
                    {/* Kein Prozentsatz: Bei gemischten Depots hat jede Position
                        ihren eigenen; die Summe sagt hier mehr aus. */}
                    davon {eur(r.quellensteuerAngerechnet)} angerechnet
                    {r.quellensteuerVerloren > 0 && `, ${eur(r.quellensteuerVerloren)} verloren`}
                  </td>
                  <td>{eur(r.quellensteuer)}</td>
                  <td>{eur(r.quellensteuer / 12)}</td>
                </tr>
              )}

              <tr>
                <td>
                  <span className="swatch-cell">
                    <span className="swatch" style={{ background: 'var(--series-2)' }} />
                    Kapitalertragsteuer
                  </span>
                </td>
                <td className="cell-rate">
                  {/* Bei Kirchensteuerpflicht sinkt der wirksame Satz unter 25 %,
                      weil die Kirchensteuer die Bemessung selbst mindert. */}
                  {r.kirchensteuersatz > 0 && r.bemessungsgrundlage > 0
                    ? `${prozent(r.kapitalertragsteuer / r.bemessungsgrundlage, 2)} statt 25 %`
                    : '25 %'}
                </td>
                <td>{eur(r.kapitalertragsteuer)}</td>
                <td>{eur(r.kapitalertragsteuer / 12)}</td>
              </tr>
              <tr>
                <td>Solidaritätszuschlag</td>
                <td className="cell-rate">5,5 % der Kapitalertragsteuer</td>
                <td>{eur(r.soli)}</td>
                <td>{eur(r.soli / 12)}</td>
              </tr>
              <tr>
                <td>Kirchensteuer</td>
                <td className="cell-rate">
                  {r.kirchensteuersatz > 0
                    ? `${num(r.kirchensteuersatz * 100)} % der Kapitalertragsteuer`
                    : 'nicht kirchensteuerpflichtig'}
                </td>
                <td>{eur(r.kirchensteuer)}</td>
                <td>{eur(r.kirchensteuer / 12)}</td>
              </tr>

              <tr className="row-sum">
                <td>Steuern gesamt</td>
                <td className="cell-rate">{prozent(r.effektiverSteuersatz)} der Bruttodividende</td>
                <td>{eur(r.steuernGesamt)}</td>
                <td>{eur(r.steuernGesamt / 12)}</td>
              </tr>
              <tr className="row-highlight">
                <td>
                  <span className="swatch-cell">
                    <span className="swatch" style={{ background: 'var(--series-1)' }} />
                    <strong>Nettodividende</strong>
                  </span>
                </td>
                <td className="cell-rate" />
                <td><strong>{eur(r.nettoJahr)}</strong></td>
                <td><strong>{eur(r.nettoMonat)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Wie viel Depot brauche ich dafür?">
        <NumberField
          label="Gewünschtes Netto im Monat"
          unit="€"
          min={0}
          dezimalstellen={2}
          value={zielNetto}
          onChange={setzeZielNetto}
        />
        {noetigesDepot !== null ? (
          <div style={{ marginTop: 16 }}>
            <Insight title="Benötigter Depotwert">
              Für <strong>{eur(zielNetto)}</strong> netto im Monat brauchen Sie bei
              {r.mischrendite !== null ? ` ${numFlex(r.mischrendite)} %` : ''} Mischrendite und
              unveränderter Aufteilung ein Depot von etwa{' '}
              <strong>{eurRund(noetigesDepot)}</strong>
              {r.portfolio !== null && r.portfolio > 0 && (
                <>
                  {' '}— das ist das {num(noetigesDepot / r.portfolio)}-fache Ihres heutigen Depots
                </>
              )}.
            </Insight>
          </div>
        ) : (
          <Note art="warnung">
            Ohne Dividendenrendite lässt sich kein Depotwert berechnen — tragen Sie links
            mindestens eine Position mit einer Rendite größer als null ein.
          </Note>
        )}
      </Card>

      {r.mischrendite !== null && r.mischrendite > 0 && (
        <Card
          title="Was verschiedene Depotgrößen bringen"
          note={`bei ${numFlex(r.mischrendite)} % Mischrendite und gleicher Aufteilung`}
        >
          <div className="table-scroll">
            <table className="ledger">
              <thead>
                <tr>
                  <th scope="col">Depotwert</th>
                  <th scope="col">Brutto / Jahr</th>
                  <th scope="col">Netto / Jahr</th>
                  <th scope="col">Netto / Monat</th>
                  <th scope="col">Steuerquote</th>
                </tr>
              </thead>
              <tbody>
                {STUFEN.map((wert) => {
                  const stufe = berechneDividende(
                    { ...eingabe, eingabeart: 'portfolio', portfolio: wert }, lage,
                  );
                  const aktuell = r.portfolio !== null
                    && Math.abs(r.portfolio - wert) < wert * 0.02;
                  return (
                    <tr key={wert} className={aktuell ? 'row-highlight' : undefined}>
                      <td>
                        {eurRund(wert)}
                        {aktuell && <span className="cell-rate"> · Ihr Depot</span>}
                      </td>
                      <td>{eur(stufe.bruttoJahr)}</td>
                      <td>{eur(stufe.nettoJahr)}</td>
                      <td>{eur(stufe.nettoMonat)}</td>
                      <td className="cell-rate">{prozent(stufe.effektiverSteuersatz)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {r.hinweise.length > 0 && (
        <div className="notes">
          {r.hinweise.map((text) => <Note key={text}>{text}</Note>)}
        </div>
      )}

      <Note>
        Gerechnet wird mit der Abgeltungsteuer von {prozent(KAPITAL.abgeltungsteuer, 0)} nach der
        Formel des § 32d Abs. 1 EStG. Liegt Ihr persönlicher Steuersatz darunter, können Sie über
        die Steuererklärung die Günstigerprüfung beantragen und zahlen dann weniger. Kursgewinne,
        Vorabpauschalen und Verlustverrechnungstöpfe sind nicht enthalten.
      </Note>
    </>
  );
}
