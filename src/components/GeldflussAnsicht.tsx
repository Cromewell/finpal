import { Fragment, useState } from 'react';
import { ausgabeBetrag, budgetSummen, type Budget } from '../lib/budget';
import { eur, prozent } from '../lib/format';
import { Card, Insight, Note, Segmented } from './ui';
import { SankeyDiagramm } from './SankeyDiagramm';

type Darstellung = 'buendig' | 'aufgefaechert';

export function GeldflussAnsicht({ budget }: { budget: Budget }) {
  const [darstellung, setzeDarstellung] = useState<Darstellung>('buendig');
  const summen = budgetSummen(budget);
  const hatUnterposten = budget.ausgaben.some((a) => a.unterposten.some((u) => u.betrag > 0));
  const unterdeckt = summen.saldo < 0;
  const posten = budget.ausgaben
    .map((a) => ({ ...a, summe: ausgabeBetrag(a) }))
    .filter((a) => a.summe > 0)
    .sort((a, b) => b.summe - a.summe);

  return (
    <>
      <section className="card">
        <div className="headline">
          <div className="headline__figure">
            <span className="headline__label">
              {unterdeckt ? 'Monatliche Lücke' : 'Bleibt übrig im Monat'}
            </span>
            <span className="headline__value">{eur(Math.abs(summen.saldo))}</span>
            <span className="headline__sub">
              {unterdeckt
                ? `${eur(summen.ausgaben)} Ausgaben stehen ${eur(summen.einnahmen)} Einnahmen gegenüber`
                : `aus ${eur(summen.einnahmen)} Einnahmen — eine Sparquote von ${prozent(summen.sparquote)}`}
            </span>
          </div>
          <div className="headline__side">
            <div className="mini">
              <span className="mini__label">Einnahmen</span>
              <span className="mini__value">{eur(summen.einnahmen)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Ausgaben</span>
              <span className="mini__value">{eur(summen.ausgaben)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">{unterdeckt ? 'Lücke im Jahr' : 'Im Jahr übrig'}</span>
              <span className="mini__value">{eur(Math.abs(summen.saldo) * 12)}</span>
            </div>
          </div>
        </div>
      </section>

      <Card
        title="Wohin das Geld fließt"
        headExtra={hatUnterposten ? (
          <div className="sankey__modus">
            <Segmented
              ariaLabel="Darstellung des Diagramms"
              value={darstellung}
              onChange={setzeDarstellung}
              options={[
                { wert: 'buendig' as const, label: 'Bündig', titel: 'Unterposten liegen genau im Band ihrer Ausgabe' },
                { wert: 'aufgefaechert' as const, label: 'Aufgefächert', titel: 'Enden auseinanderziehen, damit jede Beschriftung lesbar ist' },
              ]}
            />
          </div>
        ) : undefined}
        note="Zum Hervorheben über einen Posten fahren"
      >
        <SankeyDiagramm budget={budget} aufgefaechert={darstellung === 'aufgefaechert'} />
        <div className="legend" style={{ marginTop: 14 }}>
          <span className="legend__item">
            <span className="legend__key" style={{ background: 'var(--fluss-einnahme)' }} />Einnahmen
          </span>
          <span className="legend__item">
            <span className="legend__key" style={{ background: 'var(--fluss-ausgabe)' }} />Ausgaben
          </span>
          <span className="legend__item">
            <span className="legend__key" style={{ background: 'var(--fluss-unterposten)' }} />Unterposten
          </span>
          <span className="legend__item">
            <span className="legend__key" style={{ background: 'var(--fluss-ueberschuss)' }} />Bleibt übrig
          </span>
          {unterdeckt && (
            <span className="legend__item">
              <span className="legend__key" style={{ background: 'var(--fluss-fehlbetrag)' }} />Aus Rücklagen
            </span>
          )}
        </div>
      </Card>

      {summen.groessterPosten && !unterdeckt && (
        <Insight title="Der größte Hebel">
          <strong>{summen.groessterPosten.name}</strong> ist mit{' '}
          <strong>{eur(summen.groessterPosten.betrag)}</strong> Ihr größter Posten — das sind{' '}
          {prozent(summen.groessterPosten.anteil)} aller Einnahmen. Schon{' '}
          {prozent(0.1, 0)} weniger dort entsprächen{' '}
          <strong>{eur(summen.groessterPosten.betrag * 0.1 * 12)}</strong> im Jahr.
        </Insight>
      )}

      {unterdeckt && (
        <Note art="warnung">
          Die Ausgaben liegen {eur(-summen.saldo)} über den Einnahmen. Im Diagramm erscheint die
          Lücke links als eigene Quelle „Aus Rücklagen“ — gedeckt wird sie aus Erspartem oder
          über Kredit.
        </Note>
      )}

      <Card title="Alle Posten" note="Zugleich die Datentabelle zum Diagramm">
        <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Posten</th>
                <th scope="col">Monat</th>
                <th scope="col">Anteil an den Einnahmen</th>
                <th scope="col">Jahr</th>
              </tr>
            </thead>
            <tbody>
              <tr className="row-group"><td colSpan={4}>Einnahmen</td></tr>
              {budget.einnahmen.filter((e) => e.betrag > 0).map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="swatch-cell">
                      <span className="swatch" style={{ background: 'var(--fluss-einnahme)' }} />
                      {e.name || 'Ohne Bezeichnung'}
                    </span>
                  </td>
                  <td>{eur(e.betrag)}</td>
                  <td className="cell-rate">
                    {summen.einnahmen > 0 ? prozent(e.betrag / summen.einnahmen) : '—'}
                  </td>
                  <td>{eur(e.betrag * 12)}</td>
                </tr>
              ))}

              <tr className="row-group"><td colSpan={4}>Ausgaben</td></tr>
              {posten.map((a) => (
                <Fragment key={a.id}>
                  <tr>
                    <td>
                      <span className="swatch-cell">
                        <span className="swatch" style={{ background: 'var(--fluss-ausgabe)' }} />
                        {a.name || 'Ohne Bezeichnung'}
                      </span>
                    </td>
                    <td>{eur(a.summe)}</td>
                    <td className="cell-rate">
                      {summen.einnahmen > 0 ? prozent(a.summe / summen.einnahmen) : '—'}
                    </td>
                    <td>{eur(a.summe * 12)}</td>
                  </tr>
                  {a.unterposten.filter((u) => u.betrag > 0).map((u) => (
                    <tr key={u.id} className="row-kind">
                      <td>
                        <span className="swatch-cell">
                          <span className="swatch" style={{ background: 'var(--fluss-unterposten)' }} />
                          {u.name || 'Ohne Bezeichnung'}
                        </span>
                      </td>
                      <td>{eur(u.betrag)}</td>
                      <td className="cell-rate">
                        {summen.einnahmen > 0 ? prozent(u.betrag / summen.einnahmen) : '—'}
                      </td>
                      <td>{eur(u.betrag * 12)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}

              <tr className="row-sum">
                <td>Ausgaben gesamt</td>
                <td>{eur(summen.ausgaben)}</td>
                <td className="cell-rate">
                  {summen.einnahmen > 0 ? prozent(summen.ausgaben / summen.einnahmen) : '—'}
                </td>
                <td>{eur(summen.ausgaben * 12)}</td>
              </tr>
              <tr className="row-highlight">
                <td>
                  <span className="swatch-cell">
                    <span className="swatch" style={{
                      background: unterdeckt ? 'var(--fluss-fehlbetrag)' : 'var(--fluss-ueberschuss)',
                    }} />
                    <strong>{unterdeckt ? 'Fehlbetrag' : 'Bleibt übrig'}</strong>
                  </span>
                </td>
                <td><strong>{eur(summen.saldo)}</strong></td>
                <td className="cell-rate">
                  {summen.einnahmen > 0 ? prozent(summen.saldo / summen.einnahmen) : '—'}
                </td>
                <td><strong>{eur(summen.saldo * 12)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Note>
        Alle Beträge verstehen sich als Monatswerte. Für Posten, die nur einmal im Jahr anfallen —
        Versicherungen, Urlaub, Reparaturen — tragen Sie am besten ein Zwölftel ein; so bleibt das
        Bild über das Jahr hinweg ehrlich.
      </Note>
    </>
  );
}
