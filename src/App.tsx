import { useCallback, useEffect, useMemo, useState } from 'react';
import { JAHR } from './lib/constants';
import { berechneGehalt, defaultPayrollInput, type PayrollInput } from './lib/payroll';
import { berechneTeilzeit } from './lib/teilzeit';
import { eur, num, prozent, stunden as fmtStunden } from './lib/format';
import {
  ladeEingaben, ladeThema, setzeSpeichernErlaubt, sichereEingaben, sichereThema,
  speichernErlaubt, type Thema,
} from './lib/persist';
import { dekodiereZustand, ladeDateiHerunter, teileLink } from './lib/share';
import { EingabeFormular } from './components/EingabeFormular';
import { BruttoNettoAnsicht } from './components/BruttoNettoAnsicht';
import { TeilzeitAnsicht } from './components/TeilzeitAnsicht';
import { MethodikKarte, PrivatsphaereKarte, RechengroessenKarte } from './components/Infoabschnitte';
import { Werkzeugleiste } from './components/Werkzeugleiste';
import { Card, IconClock, IconMoon, IconOffline, IconScale, IconShield, IconSun } from './components/ui';

type Reiter = 'brutto-netto' | 'teilzeit';

interface Zustand {
  eingabe: PayrollInput;
  stundenIst: number;
  stundenZiel: number;
  reiter: Reiter;
}

const START: Zustand = {
  eingabe: defaultPayrollInput(),
  stundenIst: 40,
  stundenZiel: 32,
  reiter: 'brutto-netto',
};

/** Übernimmt nur bekannte Felder — fremde Werte aus einem Link bleiben draußen. */
function zusammenfuehren(basis: Zustand, teil: Partial<Zustand> | null): Zustand {
  if (!teil) return basis;
  return {
    eingabe: { ...basis.eingabe, ...(teil.eingabe ?? {}) },
    stundenIst: typeof teil.stundenIst === 'number' && teil.stundenIst > 0 ? teil.stundenIst : basis.stundenIst,
    stundenZiel: typeof teil.stundenZiel === 'number' && teil.stundenZiel > 0 ? teil.stundenZiel : basis.stundenZiel,
    reiter: teil.reiter === 'teilzeit' || teil.reiter === 'brutto-netto' ? teil.reiter : basis.reiter,
  };
}

function anfangszustand(): Zustand {
  const ausLink = dekodiereZustand<Zustand>(window.location.hash);
  if (ausLink) return zusammenfuehren(START, ausLink);
  return zusammenfuehren(START, ladeEingaben<Zustand>());
}

export default function App() {
  const [zustand, setzeZustand] = useState<Zustand>(anfangszustand);
  const [thema, setzeThemaZustand] = useState<Thema>(ladeThema);
  const [speichern, setzeSpeichern] = useState(speichernErlaubt);
  const [meldung, setzeMeldung] = useState<string | null>(null);

  const { eingabe, stundenIst, stundenZiel, reiter } = zustand;

  // Thema auf das Wurzelelement schreiben.
  useEffect(() => {
    const wurzel = document.documentElement;
    if (thema === 'system') wurzel.removeAttribute('data-theme');
    else wurzel.setAttribute('data-theme', thema);
    sichereThema(thema);
  }, [thema]);

  useEffect(() => {
    if (speichern) sichereEingaben(zustand);
  }, [zustand, speichern]);

  useEffect(() => {
    if (!meldung) return;
    const uhr = window.setTimeout(() => setzeMeldung(null), 2600);
    return () => window.clearTimeout(uhr);
  }, [meldung]);

  const patch = useCallback((teil: Partial<PayrollInput>) => {
    setzeZustand((alt) => ({ ...alt, eingabe: { ...alt.eingabe, ...teil } }));
  }, []);

  const abrechnung = useMemo(() => berechneGehalt(eingabe), [eingabe]);
  const teilzeit = useMemo(
    () => berechneTeilzeit({ basis: eingabe, stundenIst, stundenZiel }),
    [eingabe, stundenIst, stundenZiel],
  );

  const schalteSpeichern = (wert: boolean) => {
    setzeSpeichernErlaubt(wert);
    setzeSpeichern(wert);
    if (wert) sichereEingaben(zustand);
    setzeMeldung(wert ? 'Eingaben werden auf diesem Gerät gemerkt' : 'Gespeicherte Eingaben gelöscht');
  };

  const teilen = async () => {
    const link = teileLink(zustand);
    try {
      await navigator.clipboard.writeText(link);
      setzeMeldung('Link kopiert — die Werte stecken im Link, nicht auf einem Server');
    } catch {
      window.location.hash = link.slice(link.indexOf('#'));
      setzeMeldung('Link steht in der Adresszeile');
    }
  };

  const csv = () => {
    const zeilen: string[][] = reiter === 'brutto-netto'
      ? [
        ['Posten', 'Monat in Euro', 'Jahr in Euro'],
        ['Bruttoentgelt', num(abrechnung.brutto.monat), num(abrechnung.brutto.jahr)],
        ['Lohnsteuer', num(abrechnung.lohnsteuer.monat), num(abrechnung.lohnsteuer.jahr)],
        ['Solidaritaetszuschlag', num(abrechnung.soli.monat), num(abrechnung.soli.jahr)],
        ['Kirchensteuer', num(abrechnung.kirchensteuer.monat), num(abrechnung.kirchensteuer.jahr)],
        ['Krankenversicherung', num(abrechnung.sv.an.kv), num(abrechnung.sv.an.kv * 12)],
        ['Pflegeversicherung', num(abrechnung.sv.an.pv), num(abrechnung.sv.an.pv * 12)],
        ['Rentenversicherung', num(abrechnung.sv.an.rv), num(abrechnung.sv.an.rv * 12)],
        ['Arbeitslosenversicherung', num(abrechnung.sv.an.av), num(abrechnung.sv.an.av * 12)],
        ['Private Kranken- und Pflegeversicherung', num(abrechnung.pkvEigenanteil.monat), num(abrechnung.pkvEigenanteil.jahr)],
        ['Abzuege gesamt', num(abrechnung.abzuege.monat), num(abrechnung.abzuege.jahr)],
        ['Nettoentgelt', num(abrechnung.netto.monat), num(abrechnung.netto.jahr)],
        ['Arbeitgeberanteil', num(abrechnung.agAnteil.monat), num(abrechnung.agAnteil.jahr)],
        ['Gesamtaufwand Arbeitgeber', num(abrechnung.arbeitgeberkosten.monat), num(abrechnung.arbeitgeberkosten.jahr)],
      ]
      : [
        ['Wochenstunden', 'Brutto Monat in Euro', 'Netto Monat in Euro', 'Netto je Wochenstunde in Euro'],
        ...teilzeit.verlauf.map((p) => [
          fmtStunden(p.stunden), num(p.bruttoMonat), num(p.nettoMonat), num(p.nettoProWochenstunde),
        ]),
      ];

    const inhalt = zeilen.map((z) => z.map((f) => `"${f.replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const name = reiter === 'brutto-netto' ? `finpal-brutto-netto-${JAHR}.csv` : `finpal-teilzeit-${JAHR}.csv`;
    ladeDateiHerunter(name, inhalt, 'text/csv');
    setzeMeldung('CSV im Browser erzeugt — ohne Umweg über einen Server');
  };

  const zuruecksetzen = () => {
    setzeZustand({ ...START, reiter });
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    setzeMeldung('Auf Standardwerte zurückgesetzt');
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">fp</span>
            <span>
              <span className="brand__name">finpal</span>
              <span className="brand__claim"> · Brutto, Netto und Teilzeit für {JAHR}</span>
            </span>
          </div>

          <span className="shield">
            <span className="shield__dot" aria-hidden="true" />
            Rechnet nur in Ihrem Browser
          </span>

          <button
            type="button"
            className="btn btn--ghost"
            aria-label={`Darstellung wechseln, derzeit ${
              thema === 'system' ? 'Systemvorgabe' : thema === 'hell' ? 'hell' : 'dunkel'
            }`}
            onClick={() => setzeThemaZustand(
              thema === 'system' ? 'hell' : thema === 'hell' ? 'dunkel' : 'system',
            )}
          >
            {thema === 'dunkel' ? <IconMoon /> : <IconSun />}
            {thema === 'system' ? 'System' : thema === 'hell' ? 'Hell' : 'Dunkel'}
          </button>
        </div>
      </header>

      <main className="shell">
        <div className="hero">
          <h1 className="hero__title">
            Was von Ihrem Gehalt übrig bleibt — und was eine kürzere Woche wirklich kostet.
          </h1>
          <p className="hero__lead">
            Zwei Rechner für {JAHR}: Brutto zu Netto für alle Steuerklassen und Bundesländer, und
            eine Vorausschau für eine geplante Stundenreduktion. Der Steuerteil folgt dem amtlichen
            Programmablaufplan des Bundesfinanzministeriums — und alles läuft ausschließlich auf
            Ihrem Gerät.
          </p>
          <div className="hero__facts">
            <span className="fact"><IconShield />Keine Übertragung Ihrer Daten</span>
            <span className="fact"><IconOffline />Funktioniert offline</span>
            <span className="fact"><IconScale />Amtlicher Rechenkern {JAHR}</span>
            <span className="fact"><IconClock />Teilzeit-Vorausschau inklusive Rente</span>
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="Rechner wählen">
          <button
            type="button" role="tab" className="tab"
            aria-selected={reiter === 'brutto-netto'}
            onClick={() => setzeZustand((alt) => ({ ...alt, reiter: 'brutto-netto' }))}
          >
            Brutto-Netto-Rechner
          </button>
          <button
            type="button" role="tab" className="tab"
            aria-selected={reiter === 'teilzeit'}
            onClick={() => setzeZustand((alt) => ({ ...alt, reiter: 'teilzeit' }))}
          >
            Teilzeit<span className="tab__lang"> &amp; Stundenreduktion</span>
          </button>
        </div>

        <div className="layout">
          <div className="layout__inputs">
            <Card
              title="Ihre Angaben"
              note={reiter === 'teilzeit' ? `${fmtStunden(stundenIst)} Std. heute` : undefined}
            >
              <EingabeFormular
                werte={eingabe}
                patch={patch}
                bruttoLabel={reiter === 'teilzeit' ? 'Heutiges Bruttogehalt' : 'Bruttogehalt'}
                bruttoHinweis={reiter === 'teilzeit'
                  ? `Das Gehalt bei ${fmtStunden(stundenIst)} Wochenstunden`
                  : undefined}
              />
            </Card>
            <Werkzeugleiste onTeilen={teilen} onCsv={csv} onZuruecksetzen={zuruecksetzen} />
          </div>

          <div className="layout__results">
            {reiter === 'brutto-netto'
              ? <BruttoNettoAnsicht ergebnis={abrechnung} />
              : (
                <TeilzeitAnsicht
                  ergebnis={teilzeit}
                  stundenIst={stundenIst}
                  stundenZiel={stundenZiel}
                  setzeStundenIst={(wert) => setzeZustand((alt) => ({ ...alt, stundenIst: wert }))}
                  setzeStundenZiel={(wert) => setzeZustand((alt) => ({ ...alt, stundenZiel: wert }))}
                />
              )}
          </div>
        </div>

        <div className="cols" style={{ marginTop: 32 }}>
          <PrivatsphaereKarte speichern={speichern} setzeSpeichern={schalteSpeichern} />
          <RechengroessenKarte />
        </div>

        <div style={{ marginTop: 16 }}>
          <MethodikKarte />
        </div>

        <footer className="footer">
          <p>
            finpal rechnet den Lohnsteuerabzug {JAHR} nach dem amtlichen Programmablaufplan des
            Bundesfinanzministeriums. Ergebnis ohne Gewähr und keine steuerliche Beratung —
            verbindlich ist die Abrechnung Ihres Arbeitgebers.
          </p>
          <p>
            Beispiel: {eur(abrechnung.brutto.monat)} brutto in Steuerklasse{' '}
            {abrechnung.eingabe.steuerklasse} ergeben {eur(abrechnung.netto.monat)} netto — eine
            Abgabenquote von {prozent(abrechnung.abgabenquote)}.
          </p>
        </footer>
      </main>

      {meldung && <div className="toast" role="status">{meldung}</div>}
    </>
  );
}
