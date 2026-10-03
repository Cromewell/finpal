import { SV } from '../lib/constants';
import { eur, num, prozent } from '../lib/format';
import type { PayrollResult } from '../lib/payroll';
import { Card, Note } from './ui';
import { VerteilungBalken } from './VerteilungBalken';

export function BruttoNettoAnsicht({ ergebnis }: { ergebnis: PayrollResult }) {
  const { brutto, netto, steuern, sv, abzuege } = ergebnis;
  const privat = ergebnis.eingabe.kvTyp === 'privat';
  const svGesamtAn = sv.an.summe + ergebnis.pkvEigenanteil.monat;

  return (
    <>
      <section className="card">
        <div className="headline">
          <div className="headline__figure">
            <span className="headline__label">Netto im Monat</span>
            <span className="headline__value">{eur(netto.monat)}</span>
            <span className="headline__sub">
              aus {eur(brutto.monat)} brutto — {prozent(ergebnis.abgabenquote)} gehen an Steuern und Beiträge
            </span>
          </div>
          <div className="headline__side">
            <div className="mini">
              <span className="mini__label">Netto im Jahr</span>
              <span className="mini__value">{eur(netto.jahr)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Steuern</span>
              <span className="mini__value">{eur(steuern.monat)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Sozialabgaben</span>
              <span className="mini__value">{eur(svGesamtAn)}</span>
            </div>
          </div>
        </div>
      </section>

      <Card title="Wohin das Brutto geht" note={`Monatlich, ${eur(brutto.monat)} gesamt`}>
        <VerteilungBalken
          gesamt={brutto.monat}
          segmente={[
            { name: 'Netto', wert: netto.monat, farbe: 'var(--series-1)' },
            { name: 'Steuern', wert: steuern.monat, farbe: 'var(--series-2)' },
            { name: 'Sozialabgaben', wert: svGesamtAn, farbe: 'var(--series-3)' },
          ]}
        />
      </Card>

      <Card title="Abrechnung im Einzelnen">
        <div className="table-scroll">
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Posten</th>
                <th scope="col">Satz</th>
                <th scope="col">Monat</th>
                <th scope="col">Jahr</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bruttoentgelt</td>
                <td className="cell-rate" />
                <td>{eur(brutto.monat)}</td>
                <td>{eur(brutto.jahr)}</td>
              </tr>

              <tr className="row-group"><td colSpan={4}>Steuern</td></tr>
              <tr>
                <td>
                  <span className="swatch-cell">
                    <span className="swatch" style={{ background: 'var(--series-2)' }} />Lohnsteuer
                  </span>
                </td>
                <td className="cell-rate">
                  {brutto.monat > 0 ? prozent(ergebnis.lohnsteuer.monat / brutto.monat) : '—'}
                </td>
                <td>{eur(ergebnis.lohnsteuer.monat)}</td>
                <td>{eur(ergebnis.lohnsteuer.jahr)}</td>
              </tr>
              <tr>
                <td>Solidaritätszuschlag</td>
                <td className="cell-rate">
                  {ergebnis.soli.monat > 0 ? 'bis 5,5 % der Lohnsteuer' : 'Freigrenze nicht erreicht'}
                </td>
                <td>{eur(ergebnis.soli.monat)}</td>
                <td>{eur(ergebnis.soli.jahr)}</td>
              </tr>
              <tr>
                <td>Kirchensteuer</td>
                <td className="cell-rate">
                  {ergebnis.kirchensteuersatz > 0
                    ? `${num(ergebnis.kirchensteuersatz * 100)} % der Lohnsteuer`
                    : 'nicht kirchensteuerpflichtig'}
                </td>
                <td>{eur(ergebnis.kirchensteuer.monat)}</td>
                <td>{eur(ergebnis.kirchensteuer.jahr)}</td>
              </tr>

              <tr className="row-group"><td colSpan={4}>Sozialversicherung</td></tr>
              {privat ? (
                <tr>
                  <td>
                    <span className="swatch-cell">
                      <span className="swatch" style={{ background: 'var(--series-3)' }} />
                      Private Kranken- und Pflegeversicherung
                    </span>
                  </td>
                  <td className="cell-rate">
                    Prämie {eur(ergebnis.eingabe.pkvKrankenMonat + ergebnis.eingabe.pkvPflegeMonat)} abzüglich{' '}
                    {eur(sv.pkvZuschuss)} Zuschuss
                  </td>
                  <td>{eur(ergebnis.pkvEigenanteil.monat)}</td>
                  <td>{eur(ergebnis.pkvEigenanteil.jahr)}</td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td>
                      <span className="swatch-cell">
                        <span className="swatch" style={{ background: 'var(--series-3)' }} />Krankenversicherung
                      </span>
                    </td>
                    <td className="cell-rate">{prozent(sv.saetze.kvAn, 2)}</td>
                    <td>{eur(sv.an.kv)}</td>
                    <td>{eur(sv.an.kv * 12)}</td>
                  </tr>
                  <tr>
                    <td>Pflegeversicherung</td>
                    <td className="cell-rate">{prozent(sv.saetze.pvAn, 2)}</td>
                    <td>{eur(sv.an.pv)}</td>
                    <td>{eur(sv.an.pv * 12)}</td>
                  </tr>
                </>
              )}
              <tr>
                <td>Rentenversicherung</td>
                <td className="cell-rate">
                  {ergebnis.eingabe.rvPflicht ? prozent(sv.saetze.rvAn, 2) : 'keine Pflicht'}
                </td>
                <td>{eur(sv.an.rv)}</td>
                <td>{eur(sv.an.rv * 12)}</td>
              </tr>
              <tr>
                <td>Arbeitslosenversicherung</td>
                <td className="cell-rate">
                  {ergebnis.eingabe.avPflicht ? prozent(sv.saetze.avAn, 2) : 'keine Pflicht'}
                </td>
                <td>{eur(sv.an.av)}</td>
                <td>{eur(sv.an.av * 12)}</td>
              </tr>

              <tr className="row-sum">
                <td>Abzüge gesamt</td>
                <td className="cell-rate">{prozent(ergebnis.abgabenquote)}</td>
                <td>{eur(abzuege.monat)}</td>
                <td>{eur(abzuege.jahr)}</td>
              </tr>
              <tr className="row-highlight">
                <td>
                  <span className="swatch-cell">
                    <span className="swatch" style={{ background: 'var(--series-1)' }} />
                    <strong>Nettoentgelt</strong>
                  </span>
                </td>
                <td className="cell-rate" />
                <td><strong>{eur(netto.monat)}</strong></td>
                <td><strong>{eur(netto.jahr)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="cols">
        <Card title="Was der Arbeitsplatz kostet">
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">Bruttoentgelt</span>
              <span className="kv__val">{eur(brutto.monat)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">
                {privat ? 'Zuschuss zur privaten Versicherung' : 'Krankenversicherung (Arbeitgeber)'}
              </span>
              <span className="kv__val">{eur(sv.ag.kv)}</span>
            </div>
            {!privat && (
              <div className="kv__row">
                <span className="kv__key">Pflegeversicherung (Arbeitgeber)</span>
                <span className="kv__val">{eur(sv.ag.pv)}</span>
              </div>
            )}
            <div className="kv__row">
              <span className="kv__key">Rentenversicherung (Arbeitgeber)</span>
              <span className="kv__val">{eur(sv.ag.rv)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Arbeitslosenversicherung (Arbeitgeber)</span>
              <span className="kv__val">{eur(sv.ag.av)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key"><strong>Gesamtaufwand im Monat</strong></span>
              <span className="kv__val">{eur(ergebnis.arbeitgeberkosten.monat)}</span>
            </div>
          </div>
          <p className="field__hint" style={{ marginTop: 12 }}>
            Von {eur(ergebnis.arbeitgeberkosten.monat)} Gesamtaufwand kommen{' '}
            {prozent(netto.monat / ergebnis.arbeitgeberkosten.monat)} bei Ihnen als Netto an. Nicht
            enthalten sind Umlagen (U1/U2, Insolvenzgeld) und die gesetzliche Unfallversicherung.
          </p>
        </Card>

        <Card title="Bemessungsgrundlagen">
          <div className="kv">
            <div className="kv__row">
              <span className="kv__key">Kranken- und Pflegeversicherung</span>
              <span className="kv__val">{eur(sv.bemessung.kvPv)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Renten- und Arbeitslosenversicherung</span>
              <span className="kv__val">{eur(sv.bemessung.rvAv)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Grenze KV / PV im Monat</span>
              <span className="kv__val">{eur(SV.bbgKvPvJahr / 12)}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Grenze RV / AV im Monat</span>
              <span className="kv__val">{eur(SV.bbgRvAvJahr / 12)}</span>
            </div>
            {sv.bemessung.anFiktiv !== null && (
              <div className="kv__row">
                <span className="kv__key">Reduzierte Grundlage im Übergangsbereich</span>
                <span className="kv__val">{eur(sv.bemessung.anFiktiv)}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {ergebnis.hinweise.length > 0 && (
        <div className="notes">
          {ergebnis.hinweise.map((h) => (
            <Note key={h.text} art={h.art}>{h.text}</Note>
          ))}
        </div>
      )}
    </>
  );
}
