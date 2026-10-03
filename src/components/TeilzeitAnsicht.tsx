import { RENTE, WOCHEN_PRO_MONAT } from '../lib/constants';
import { eur, eurDelta, num, prozent, stunden as fmtStunden } from '../lib/format';
import type { TeilzeitErgebnis } from '../lib/teilzeit';
import { Card, IconArrow, Insight, Note, NumberField } from './ui';
import { VerlaufChart } from './VerlaufChart';

const SCHNELLWAHL = [
  { label: '4-Tage-Woche', anteil: 0.8 },
  { label: '30 Stunden', fest: 30 },
  { label: 'Halbe Stelle', anteil: 0.5 },
];

export function TeilzeitAnsicht({
  ergebnis, stundenIst, stundenZiel, setzeStundenIst, setzeStundenZiel,
}: {
  ergebnis: TeilzeitErgebnis;
  stundenIst: number;
  stundenZiel: number;
  setzeStundenIst: (wert: number) => void;
  setzeStundenZiel: (wert: number) => void;
}) {
  const reduktion = ergebnis.stundenDifferenz > 0;
  const tabellenZeilen = ergebnis.verlauf.filter(
    (p) => p.stunden % 5 === 0 || p.stunden === stundenIst || p.stunden === stundenZiel,
  );

  return (
    <>
      <Card title="Arbeitszeit" note={`Stundenlohn ${eur(ergebnis.stundenlohnBrutto)} brutto`}>
        <div className="grid-2">
          <NumberField
            label="Heute"
            hint="Vertragliche Wochenstunden"
            unit="Std."
            value={stundenIst}
            onChange={setzeStundenIst}
            min={1}
            max={60}
          />
          <NumberField
            label="Geplant"
            hint="Künftige Wochenstunden"
            unit="Std."
            value={stundenZiel}
            onChange={setzeStundenZiel}
            min={0.5}
            max={60}
          />
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label className="field__label" htmlFor="stunden-regler">
            Geplante Wochenstunden: {fmtStunden(stundenZiel)}
          </label>
          <input
            id="stunden-regler"
            className="slider"
            type="range"
            min={1}
            max={Math.max(40, stundenIst)}
            step={0.5}
            value={stundenZiel}
            onChange={(e) => setzeStundenZiel(Number(e.target.value))}
          />
          <span className="field__hint">
            {prozent(stundenZiel / stundenIst, 0)} der heutigen Arbeitszeit
          </span>
        </div>

        <div className="toolbar" style={{ marginTop: 14 }}>
          {SCHNELLWAHL.map((wahl) => {
            const ziel = wahl.fest ?? Math.round(stundenIst * (wahl.anteil ?? 1) * 2) / 2;
            return (
              <button
                key={wahl.label}
                type="button"
                className="btn btn--ghost"
                onClick={() => setzeStundenZiel(Math.min(Math.max(ziel, 0.5), 60))}
              >
                {wahl.label}
              </button>
            );
          })}
        </div>
      </Card>

      <Card title={reduktion ? 'Vorher und nachher' : 'Vergleich'}>
        <div className="compare">
          <div className="compare__col">
            <span className="compare__tag">Heute</span>
            <span className="compare__hours">{fmtStunden(stundenIst)} Stunden / Woche</span>
            <span className="compare__net">{eur(ergebnis.ist.netto.monat)}</span>
            <span className="compare__gross">netto — aus {eur(ergebnis.ist.brutto.monat)} brutto</span>
          </div>
          <div className="compare__arrow" aria-hidden="true"><IconArrow /></div>
          <div className="compare__col compare__col--target">
            <span className="compare__tag">Geplant</span>
            <span className="compare__hours">{fmtStunden(stundenZiel)} Stunden / Woche</span>
            <span className="compare__net">{eur(ergebnis.ziel.netto.monat)}</span>
            <span className="compare__gross">netto — aus {eur(ergebnis.ziel.brutto.monat)} brutto</span>
          </div>
        </div>

        {reduktion && ergebnis.grenzbelastung > 0 && (
          <div style={{ marginTop: 16 }}>
            <Insight title="Der Unterschied, auf den es ankommt">
              Brutto verzichten Sie auf <strong>{eur(ergebnis.bruttoVerlustMonat)}</strong> im Monat,
              im Netto fehlen aber nur <strong>{eur(ergebnis.nettoVerlustMonat)}</strong> — also{' '}
              {prozent(ergebnis.grenzbelastung, 0)} davon. Jede Wochenstunde, die Sie abgeben, kostet
              Sie unterm Strich <strong>{eur(ergebnis.kostenProWochenstundeMonat)}</strong> netto im Monat.
            </Insight>
          </div>
        )}
      </Card>

      <Card
        title="Netto über die Wochenstunden"
        note="Zum Erkunden mit der Maus darüberfahren"
      >
        <VerlaufChart
          punkte={ergebnis.verlauf}
          stundenIst={stundenIst}
          stundenZiel={stundenZiel}
        />
      </Card>

      <div className="cols">
        <Card title="Monat und Jahr">
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">Brutto im Monat</span>
              <span className="kv__val">{eurDelta(-ergebnis.bruttoVerlustMonat)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Netto im Monat</span>
              <span className="kv__val">{eurDelta(-ergebnis.nettoVerlustMonat)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Netto im Jahr</span>
              <span className="kv__val">{eurDelta(-ergebnis.nettoVerlustJahr)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Netto je Wochenstunde, heute</span>
              <span className="kv__val">{eur(ergebnis.nettoProWochenstundeIst)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Netto je Wochenstunde, geplant</span>
              <span className="kv__val">{eur(ergebnis.nettoProWochenstundeZiel)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Gewonnene Zeit im Monat</span>
              <span className="kv__val">
                {num(ergebnis.stundenDifferenz * WOCHEN_PRO_MONAT)} Std.
              </span>
            </div>
          </div>
        </Card>

        <Card title="Wirkung auf die Rente">
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">Entgeltpunkte pro Jahr, heute</span>
              <span className="kv__val">{num(ergebnis.entgeltpunkteIst)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Entgeltpunkte pro Jahr, geplant</span>
              <span className="kv__val">{num(ergebnis.entgeltpunkteZiel)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Je Jahr Teilzeit weniger Bruttorente</span>
              <span className="kv__val">{eur(ergebnis.rentenverlustProJahrTeilzeit)} / Monat</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Nach 5 Jahren Teilzeit</span>
              <span className="kv__val">{eur(ergebnis.rentenverlustProJahrTeilzeit * 5)} / Monat</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Nach 10 Jahren Teilzeit</span>
              <span className="kv__val">{eur(ergebnis.rentenverlustProJahrTeilzeit * 10)} / Monat</span>
            </div>
          </div>
          <p className="field__hint" style={{ marginTop: 12 }}>
            Gerechnet mit dem Rentenwert von {num(RENTE.rentenwert)} € je Entgeltpunkt und dem
            vorläufigen Durchschnittsentgelt von {num(RENTE.durchschnittsentgelt)} €. Die Beträge
            zeigen heutige Kaufkraft, nicht Ihre spätere Rente.
          </p>
        </Card>
      </div>

      <Card title="Stunden im Vergleich" note="Zugleich die Datentabelle zum Diagramm">
        <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Wochenstunden</th>
                <th scope="col">Brutto / Monat</th>
                <th scope="col">Netto / Monat</th>
                <th scope="col">Netto gegenüber heute</th>
                <th scope="col">Netto je Wochenstunde</th>
              </tr>
            </thead>
            <tbody>
              {tabellenZeilen.map((p) => (
                <tr
                  key={p.stunden}
                  className={p.stunden === stundenZiel ? 'row-highlight' : undefined}
                >
                  <td>
                    {fmtStunden(p.stunden)}
                    {p.stunden === stundenIst && <span className="cell-rate"> · heute</span>}
                    {p.stunden === stundenZiel && <span className="cell-rate"> · geplant</span>}
                  </td>
                  <td>{eur(p.bruttoMonat)}</td>
                  <td>{eur(p.nettoMonat)}</td>
                  <td>{p.nettoDiff === 0 ? '—' : eurDelta(p.nettoDiff)}</td>
                  <td>{eur(p.nettoProWochenstunde)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {ergebnis.hinweise.length > 0 && (
        <div className="notes">
          {ergebnis.hinweise.map((text) => (
            <Note key={text}>{text}</Note>
          ))}
        </div>
      )}

      <Note>
        Unterstellt ist ein unveränderter Stundenlohn — das Brutto sinkt also genau im Verhältnis
        der Stunden. Zulagen, Boni oder eine Aufstockung durch den Arbeitgeber sind nicht
        berücksichtigt.
      </Note>
    </>
  );
}
