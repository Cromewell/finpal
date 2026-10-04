import { JAHR } from '../lib/constants';
import {
  berechneRente, kapitalFuerLuecke,
  type RenteEingabe, type SteuerlicheLage,
} from '../lib/rente';
import { eur, eurRund, num, numFlex, prozent } from '../lib/format';
import { Card, Insight, Note } from './ui';
import { VerteilungBalken } from './VerteilungBalken';

export function RenteAnsicht({
  eingabe, lage,
}: {
  eingabe: RenteEingabe;
  lage: SteuerlicheLage;
}) {
  const r = berechneRente(eingabe, lage, JAHR);
  const hatLuecke = r.luecke > 0;
  // Grobe Hausnummer: 25 Jahre Rentenbezug, 4 % Rendite.
  const kapitalbedarf = kapitalFuerLuecke(r.luecke, 25, 4, eingabe.inflation);

  return (
    <>
      <section className="card">
        <div className="headline">
          <div className="headline__figure">
            <span className="headline__label">
              {hatLuecke ? 'Monatliche Rentenlücke' : 'Ihre Rente deckt den Wunsch'}
            </span>
            <span className="headline__value">
              {eur(Math.abs(r.lueckeHeutigeKaufkraft))}
            </span>
            <span className="headline__sub">
              in heutiger Kaufkraft — gewünscht {eur(eingabe.wunschNettoHeute)}, zu erwarten{' '}
              {eur(r.nettoRenteHeutigeKaufkraft)} netto
            </span>
          </div>
          <div className="headline__side">
            <div className="mini">
              <span className="mini__label">Bruttorente {r.rentenbeginnJahr}</span>
              <span className="mini__value">{eurRund(r.bruttoRenteMonat)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Nettorente {r.rentenbeginnJahr}</span>
              <span className="mini__value">{eurRund(r.nettoRenteMonat)}</span>
            </div>
            <div className="mini">
              <span className="mini__label">Deckungsgrad</span>
              <span className="mini__value">{prozent(r.deckungsgrad, 0)}</span>
            </div>
          </div>
        </div>
      </section>

      <Card
        title="Was von der Bruttorente bleibt"
        note={`Monatlich bei Rentenbeginn ${r.rentenbeginnJahr}`}
      >
        <VerteilungBalken
          gesamt={r.bruttoRenteMonat}
          segmente={[
            { name: 'Netto', wert: r.nettoRenteMonat, farbe: 'var(--series-1)' },
            {
              name: 'Steuern',
              wert: r.einkommensteuerMonat + r.soliMonat + r.kirchensteuerMonat,
              farbe: 'var(--series-2)',
            },
            { name: 'Kranken- und Pflegeversicherung', wert: r.kvMonat + r.pvMonat, farbe: 'var(--series-3)' },
          ]}
        />
      </Card>

      {hatLuecke && (
        <Insight title="Was die Lücke bedeutet">
          Es fehlen <strong>{eur(r.lueckeHeutigeKaufkraft)}</strong> im Monat in heutiger Kaufkraft.
          Um das über 25 Jahre Rentenbezug aus eigenem Vermögen zu decken, bräuchten Sie bei 4 %
          Rendite rund <strong>{eurRund(kapitalbedarf)}</strong> zum Rentenbeginn. Die genaue
          Rechnung samt Abgeltungsteuer macht der Entnahmeplan.
        </Insight>
      )}

      <Card title="Von der Bruttorente zum Netto">
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
                <td>Bruttorente</td>
                <td className="cell-rate">
                  {num(r.entgeltpunkteGesamt)} Entgeltpunkte × {num(r.rentenwertBeiBeginn)} €
                </td>
                <td>{eur(r.bruttoRenteMonat)}</td>
                <td>{eur(r.bruttoRenteMonat * 12)}</td>
              </tr>

              <tr className="row-group"><td colSpan={4}>Beiträge</td></tr>
              <tr>
                <td>
                  <span className="swatch-cell">
                    <span className="swatch" style={{ background: 'var(--series-3)' }} />
                    Krankenversicherung
                  </span>
                </td>
                <td className="cell-rate">
                  7,3 % + halber Zusatzbeitrag
                </td>
                <td>{eur(r.kvMonat)}</td>
                <td>{eur(r.kvMonat * 12)}</td>
              </tr>
              <tr>
                <td>Pflegeversicherung</td>
                <td className="cell-rate">
                  {eingabe.kinderlos ? '4,2 %' : '3,6 %'} — von Rentnern allein getragen
                </td>
                <td>{eur(r.pvMonat)}</td>
                <td>{eur(r.pvMonat * 12)}</td>
              </tr>

              <tr className="row-group"><td colSpan={4}>Steuern</td></tr>
              <tr>
                <td>Steuerfreier Teil der Rente</td>
                <td className="cell-rate">
                  {prozent(1 - r.besteuerungsanteil, 1)} · dauerhaft festgeschrieben
                </td>
                <td>−{eur(r.rentenfreibetragMonat)}</td>
                <td>−{eur(r.rentenfreibetragMonat * 12)}</td>
              </tr>
              <tr>
                <td>
                  <span className="swatch-cell">
                    <span className="swatch" style={{ background: 'var(--series-2)' }} />
                    Einkommensteuer
                  </span>
                </td>
                <td className="cell-rate">
                  auf {prozent(r.besteuerungsanteil, 1)} der Rente, nach Abzug der Beiträge
                </td>
                <td>{eur(r.einkommensteuerMonat)}</td>
                <td>{eur(r.einkommensteuerMonat * 12)}</td>
              </tr>
              <tr>
                <td>Solidaritätszuschlag</td>
                <td className="cell-rate">
                  {r.soliMonat > 0 ? '5,5 %' : 'Freigrenze nicht erreicht'}
                </td>
                <td>{eur(r.soliMonat)}</td>
                <td>{eur(r.soliMonat * 12)}</td>
              </tr>
              <tr>
                <td>Kirchensteuer</td>
                <td className="cell-rate">
                  {lage.kirchensteuer ? 'auf die Einkommensteuer' : 'nicht kirchensteuerpflichtig'}
                </td>
                <td>{eur(r.kirchensteuerMonat)}</td>
                <td>{eur(r.kirchensteuerMonat * 12)}</td>
              </tr>

              <tr className="row-sum">
                <td>Abzüge gesamt</td>
                <td className="cell-rate">
                  {r.bruttoRenteMonat > 0 ? prozent(r.abzuegeMonat / r.bruttoRenteMonat) : '—'}
                </td>
                <td>{eur(r.abzuegeMonat)}</td>
                <td>{eur(r.abzuegeMonat * 12)}</td>
              </tr>
              <tr className="row-highlight">
                <td>
                  <span className="swatch-cell">
                    <span className="swatch" style={{ background: 'var(--series-1)' }} />
                    <strong>Nettorente</strong>
                  </span>
                </td>
                <td className="cell-rate">
                  entspricht {eur(r.nettoRenteHeutigeKaufkraft)} heute
                </td>
                <td><strong>{eur(r.nettoRenteMonat)}</strong></td>
                <td><strong>{eur(r.nettoRenteMonat * 12)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Wie die Rente zustande kommt">
        <div className="kv">
          <div className="kv__row">
            <span className="kv__key">Regelaltersgrenze</span>
            <span className="kv__val">
              {Math.floor(r.altersgrenze)} Jahre
              {r.altersgrenze % 1 > 0 && ` und ${Math.round((r.altersgrenze % 1) * 12)} Monate`}
            </span>
          </div>
          <div className="kv__row">
            <span className="kv__key">Rentenbeginn</span>
            <span className="kv__val">{r.rentenbeginnJahr} · noch {r.jahreBisRente} Jahre</span>
          </div>
          <div className="kv__row">
            <span className="kv__key">Entgeltpunkte bisher</span>
            <span className="kv__val">{num(eingabe.entgeltpunkteBisher)}</span>
          </div>
          <div className="kv__row">
            <span className="kv__key">Entgeltpunkte pro Jahr</span>
            <span className="kv__val">{num(r.entgeltpunkteProJahr)}</span>
          </div>
          <div className="kv__row">
            <span className="kv__key">Entgeltpunkte bei Rentenbeginn</span>
            <span className="kv__val">{num(r.entgeltpunkteGesamt)}</span>
          </div>
          <div className="kv__row">
            <span className="kv__key">Rentenwert bei Beginn</span>
            <span className="kv__val">
              {num(r.rentenwertBeiBeginn)} € · heute {num(42.52)} €
            </span>
          </div>
          <div className="kv__row">
            <span className="kv__key">Steuerpflichtiger Anteil</span>
            <span className="kv__val">{prozent(r.besteuerungsanteil, 1)}</span>
          </div>
        </div>
        <p className="field__hint" style={{ marginTop: 12 }}>
          Der Rentenwert ist mit {numFlex(eingabe.rentenanpassung)} % jährlicher Anpassung
          fortgeschrieben. Unterstellt ist außerdem, dass Ihr heutiges Einkommen bis zum
          Rentenbeginn bestehen bleibt.
        </p>
      </Card>

      {r.hinweise.length > 0 && (
        <div className="notes">
          {r.hinweise.map((text) => <Note key={text}>{text}</Note>)}
        </div>
      )}

      <Note>
        Gerechnet wird allein die gesetzliche Altersrente. Betriebliche und private Vorsorge,
        Abschläge bei vorzeitigem Rentenbeginn, Zurechnungszeiten und der Rentenbeginn vor der
        Regelaltersgrenze sind nicht enthalten. Verbindlich ist Ihre Renteninformation.
      </Note>
    </>
  );
}
