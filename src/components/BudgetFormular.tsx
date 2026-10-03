import {
  ausgabeBetrag, neueId,
  type Ausgabe, type Budget, type Einnahme, type Unterposten,
} from '../lib/budget';
import { eur, numFest } from '../lib/format';
import { useZahlEntwurf } from './useZahlEntwurf';
import { IconPlus, IconTrash } from './ui';

interface Props {
  budget: Budget;
  setzeBudget: (budget: Budget) => void;
  /** Netto aus dem Brutto-Netto-Rechner, zum Übernehmen als Einnahme. */
  nettoVorschlag: number;
}

/** Betragsfeld, das Zwischenstände beim Tippen stehen lässt. */
function BetragFeld({
  betrag, onBetrag, beschriftung,
}: {
  betrag: number;
  onBetrag: (wert: number) => void;
  beschriftung: string;
}) {
  const feld = useZahlEntwurf(betrag, onBetrag, { min: 0, dezimalstellen: 2 });
  return (
    <input
      className="control"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={beschriftung}
      {...feld}
    />
  );
}

/** Eine Zeile aus Bezeichnung und Betrag. */
function PostenZeile({
  name, betrag, betragAktiv = true, platzhalter, eingerueckt = false,
  onName, onBetrag, onLoeschen, loeschenTitel,
}: {
  name: string;
  betrag: number;
  betragAktiv?: boolean;
  platzhalter: string;
  eingerueckt?: boolean;
  onName: (wert: string) => void;
  onBetrag: (wert: number) => void;
  onLoeschen: () => void;
  loeschenTitel: string;
}) {
  return (
    <div className={`posten${eingerueckt ? ' posten--kind' : ''}`}>
      <input
        className="control posten__name"
        type="text"
        value={name}
        placeholder={platzhalter}
        aria-label="Bezeichnung"
        onChange={(e) => onName(e.target.value)}
      />
      <div className="input-affix posten__betrag">
        {betragAktiv ? (
          <BetragFeld
            betrag={betrag}
            onBetrag={onBetrag}
            beschriftung={`Betrag für ${name || platzhalter}`}
          />
        ) : (
          // Gesperrt, aber nicht leer: Die Summe der Unterposten gehört sichtbar
          // an dieselbe Stelle wie ein eingetippter Betrag.
          <input
            className="control"
            type="text"
            readOnly
            tabIndex={-1}
            aria-label={`Summe der Unterposten von ${name || platzhalter}`}
            value={numFest(betrag, 2)}
            title="Ergibt sich aus den Unterposten"
          />
        )}
        <span className="input-affix__unit">€</span>
      </div>
      <button
        type="button"
        className="posten__weg"
        aria-label={loeschenTitel}
        title={loeschenTitel}
        onClick={onLoeschen}
      >
        <IconTrash />
      </button>
    </div>
  );
}

export function BudgetFormular({ budget, setzeBudget, nettoVorschlag }: Props) {
  const aendereEinnahme = (id: string, teil: Partial<Einnahme>) =>
    setzeBudget({
      ...budget,
      einnahmen: budget.einnahmen.map((e) => (e.id === id ? { ...e, ...teil } : e)),
    });

  const aendereAusgabe = (id: string, teil: Partial<Ausgabe>) =>
    setzeBudget({
      ...budget,
      ausgaben: budget.ausgaben.map((a) => (a.id === id ? { ...a, ...teil } : a)),
    });

  const aendereUnterposten = (ausgabeId: string, id: string, teil: Partial<Unterposten>) =>
    setzeBudget({
      ...budget,
      ausgaben: budget.ausgaben.map((a) => (a.id === ausgabeId
        ? { ...a, unterposten: a.unterposten.map((u) => (u.id === id ? { ...u, ...teil } : u)) }
        : a)),
    });

  return (
    <>
      <fieldset className="fieldset">
        <legend className="fieldset__legend">Einnahmen</legend>

        <div className="posten-liste">
          {budget.einnahmen.map((e) => (
            <PostenZeile
              key={e.id}
              name={e.name}
              betrag={e.betrag}
              platzhalter="z. B. Gehalt"
              onName={(name) => aendereEinnahme(e.id, { name })}
              onBetrag={(betrag) => aendereEinnahme(e.id, { betrag })}
              onLoeschen={() => setzeBudget({
                ...budget, einnahmen: budget.einnahmen.filter((x) => x.id !== e.id),
              })}
              loeschenTitel={`Einnahme „${e.name}“ entfernen`}
            />
          ))}
        </div>

        <div className="toolbar">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setzeBudget({
              ...budget,
              einnahmen: [...budget.einnahmen, { id: neueId('e'), name: '', betrag: 0 }],
            })}
          >
            <IconPlus />Einnahme
          </button>
          {nettoVorschlag > 0 && (
            <button
              type="button"
              className="btn btn--ghost"
              title="Fügt das im Brutto-Netto-Rechner ermittelte Netto als Einnahme hinzu"
              onClick={() => setzeBudget({
                ...budget,
                einnahmen: [
                  ...budget.einnahmen,
                  { id: neueId('e'), name: 'Gehalt (netto)', betrag: nettoVorschlag },
                ],
              })}
            >
              <IconPlus />Netto {eur(nettoVorschlag)}
            </button>
          )}
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset__legend">Ausgaben</legend>

        <div className="posten-liste">
          {budget.ausgaben.map((a) => {
            const hatKinder = a.unterposten.length > 0;
            return (
              <div className="gruppe" key={a.id}>
                <PostenZeile
                  name={a.name}
                  betrag={hatKinder ? ausgabeBetrag(a) : a.betrag}
                  betragAktiv={!hatKinder}
                  platzhalter="z. B. Wohnen"
                  onName={(name) => aendereAusgabe(a.id, { name })}
                  onBetrag={(betrag) => aendereAusgabe(a.id, { betrag })}
                  onLoeschen={() => setzeBudget({
                    ...budget, ausgaben: budget.ausgaben.filter((x) => x.id !== a.id),
                  })}
                  loeschenTitel={`Ausgabe „${a.name}“ entfernen`}
                />

                {hatKinder && (
                  <>
                    {a.unterposten.map((u) => (
                      <PostenZeile
                        key={u.id}
                        eingerueckt
                        name={u.name}
                        betrag={u.betrag}
                        platzhalter="Unterposten"
                        onName={(name) => aendereUnterposten(a.id, u.id, { name })}
                        onBetrag={(betrag) => aendereUnterposten(a.id, u.id, { betrag })}
                        onLoeschen={() => aendereAusgabe(a.id, {
                          unterposten: a.unterposten.filter((x) => x.id !== u.id),
                        })}
                        loeschenTitel={`Unterposten „${u.name}“ entfernen`}
                      />
                    ))}
                  </>
                )}

                <button
                  type="button"
                  className="btn btn--ghost gruppe__hinzu"
                  onClick={() => aendereAusgabe(a.id, {
                    // Beim ersten Unterposten wandert der bisherige Betrag mit,
                    // damit die Summe nicht plötzlich auf null springt.
                    unterposten: [
                      ...a.unterposten,
                      {
                        id: neueId('u'),
                        name: '',
                        betrag: hatKinder ? 0 : Math.max(0, a.betrag),
                      },
                    ],
                    ...(hatKinder ? {} : { betrag: 0 }),
                  })}
                >
                  <IconPlus />Unterposten
                </button>
              </div>
            );
          })}
        </div>

        <div className="toolbar">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setzeBudget({
              ...budget,
              ausgaben: [...budget.ausgaben, { id: neueId('a'), name: '', betrag: 0, unterposten: [] }],
            })}
          >
            <IconPlus />Ausgabe
          </button>
        </div>
      </fieldset>
    </>
  );
}
