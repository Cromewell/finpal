import { useCallback, useEffect, useMemo, useState } from 'react';
import { JAHR } from './lib/constants';
import { berechneGehalt, defaultPayrollInput, type PayrollInput } from './lib/payroll';
import { berechneTeilzeit } from './lib/teilzeit';
import { ausgabeBetrag, beispielBudget, budgetSummen, type Budget } from './lib/budget';
import {
  ANLAGEART_MAP,
} from './lib/constants';
import {
  berechneDividende, defaultDividendenEingabe,
  type Depotposition, type DividendenEingabe,
} from './lib/dividende';
import { berechneKredit, defaultKreditEingabe, type KreditEingabe } from './lib/kredit';
import { berechneEntnahme, defaultEntnahmeEingabe, type EntnahmeEingabe } from './lib/entnahme';
import { berechneRente, defaultRenteEingabe, type RenteEingabe } from './lib/rente';
import { neueId } from './lib/id';
import { eur, num, prozent, stunden as fmtStunden } from './lib/format';
import {
  ladeEingaben, ladeThema, setzeSpeichernErlaubt, sichereEingaben, sichereThema,
  speichernErlaubt, type Thema,
} from './lib/persist';
import { dekodiereZustand, ladeDateiHerunter, teileLink } from './lib/share';
import { EingabeFormular } from './components/EingabeFormular';
import { BruttoNettoAnsicht } from './components/BruttoNettoAnsicht';
import { TeilzeitAnsicht } from './components/TeilzeitAnsicht';
import { BudgetFormular } from './components/BudgetFormular';
import { GeldflussAnsicht } from './components/GeldflussAnsicht';
import { DividendenFormular } from './components/DividendenFormular';
import { DividendenAnsicht } from './components/DividendenAnsicht';
import { KreditFormular } from './components/KreditFormular';
import { KreditAnsicht } from './components/KreditAnsicht';
import { EntnahmeFormular } from './components/EntnahmeFormular';
import { EntnahmeAnsicht } from './components/EntnahmeAnsicht';
import { RenteFormular } from './components/RenteFormular';
import { RenteAnsicht } from './components/RenteAnsicht';
import { MethodikKarte, PrivatsphaereKarte, RechengroessenKarte } from './components/Infoabschnitte';
import { Werkzeugleiste } from './components/Werkzeugleiste';
import { Card, IconClock, IconCoin, IconFlow, IconMoon, IconOffline, IconScale, IconShield, IconSun } from './components/ui';
import { REITER, type Reiter } from './reiter';

interface Zustand {
  eingabe: PayrollInput;
  stundenIst: number;
  stundenZiel: number;
  budget: Budget;
  dividenden: DividendenEingabe;
  kredit: KreditEingabe;
  entnahme: EntnahmeEingabe;
  rente: RenteEingabe;
  reiter: Reiter;
}

const START: Zustand = {
  eingabe: defaultPayrollInput(),
  stundenIst: 40,
  stundenZiel: 32,
  budget: beispielBudget(),
  dividenden: defaultDividendenEingabe(),
  kredit: defaultKreditEingabe(),
  entnahme: defaultEntnahmeEingabe(),
  rente: defaultRenteEingabe(),
  reiter: 'brutto-netto',
};

/** Übernimmt nur bekannte Felder — fremde Werte aus einem Link bleiben draußen. */
function zusammenfuehren(basis: Zustand, teil: Partial<Zustand> | null): Zustand {
  if (!teil) return basis;
  return {
    eingabe: { ...basis.eingabe, ...(teil.eingabe ?? {}) },
    stundenIst: typeof teil.stundenIst === 'number' && teil.stundenIst > 0 ? teil.stundenIst : basis.stundenIst,
    stundenZiel: typeof teil.stundenZiel === 'number' && teil.stundenZiel > 0 ? teil.stundenZiel : basis.stundenZiel,
    budget: istBudget(teil.budget) ? teil.budget : basis.budget,
    dividenden: dividendenAus(basis.dividenden, teil.dividenden),
    kredit: { ...basis.kredit, ...(teil.kredit ?? {}) },
    entnahme: { ...basis.entnahme, ...(teil.entnahme ?? {}) },
    rente: { ...basis.rente, ...(teil.rente ?? {}) },
    reiter: REITER.some((r) => r.wert === teil.reiter) ? teil.reiter! : basis.reiter,
  };
}

/**
 * Übernimmt Dividenden-Eingaben aus Link oder Speicher.
 *
 * Ältere Stände kannten statt der Positionsliste nur eine einzelne Rendite.
 * Daraus wird eine Position gebaut, damit ein alter Link nicht stillschweigend
 * ein anderes Depot zeigt.
 */
function dividendenAus(
  basis: DividendenEingabe,
  teil: Partial<DividendenEingabe> | undefined,
): DividendenEingabe {
  if (!teil) return basis;
  const zusammen = { ...basis, ...teil };

  if (istPositionsliste(teil.positionen)) return { ...zusammen, positionen: teil.positionen };

  const alteRendite = (teil as { rendite?: unknown }).rendite;
  if (typeof alteRendite === 'number' && alteRendite > 0) {
    return {
      ...zusammen,
      positionen: [{
        id: neueId('p'),
        name: ANLAGEART_MAP[zusammen.anlageart].name,
        anteil: 100,
        rendite: alteRendite,
        anlageart: zusammen.anlageart,
        quellensteuerProzent: zusammen.quellensteuerProzent,
      }],
    };
  }
  return { ...zusammen, positionen: basis.positionen };
}

function istPositionsliste(wert: unknown): wert is Depotposition[] {
  return Array.isArray(wert) && wert.length > 0 && wert.every((p) =>
    typeof p?.id === 'string'
    && typeof p?.anteil === 'number'
    && typeof p?.rendite === 'number'
    && typeof p?.anlageart === 'string');
}

/** Prüft ein aus Link oder Speicher stammendes Budget, bevor es übernommen wird. */
function istBudget(wert: unknown): wert is Budget {
  if (typeof wert !== 'object' || wert === null) return false;
  const b = wert as Partial<Budget>;
  return Array.isArray(b.einnahmen) && Array.isArray(b.ausgaben)
    && b.einnahmen.every((e) => typeof e?.id === 'string' && typeof e?.betrag === 'number')
    && b.ausgaben.every((a) => typeof a?.id === 'string' && Array.isArray(a?.unterposten));
}

function anfangszustand(): Zustand {
  const ausLink = dekodiereZustand<Zustand>(window.location.hash);
  if (ausLink) return zusammenfuehren(START, ausLink);
  return zusammenfuehren(START, ladeEingaben<Zustand>());
}

/**
 * Überschrift und Einleitung je Werkzeug. Die Seite soll nur beschreiben, was
 * gerade gewählt ist — ein Hinweis auf den Lohnsteuer-Programmablaufplan hat
 * über dem Haushaltsrechner nichts verloren.
 */
const HERO: Record<Reiter, { titel: string; lead: string }> = {
  'brutto-netto': {
    titel: 'Was von Ihrem Gehalt übrig bleibt.',
    lead: `Brutto zu Netto für ${JAHR}: alle sechs Steuerklassen, alle sechzehn Bundesländer, gesetzliche und private Krankenversicherung, Minijob und Übergangsbereich. Der Steuerteil folgt dem amtlichen Programmablaufplan des Bundesfinanzministeriums — und alles läuft ausschließlich auf Ihrem Gerät.`,
  },
  teilzeit: {
    titel: 'Was eine kürzere Woche wirklich kostet.',
    lead: 'Weniger Stunden heißt weniger brutto — im Netto kommt davon aber nur etwa die Hälfte an. Dieser Rechner zeigt den Unterschied, die Kosten je aufgegebener Wochenstunde und was die Reduktion für Ihre spätere Rente bedeutet.',
  },
  geldfluss: {
    titel: 'Wohin Ihr Geld im Monat fließt.',
    lead: 'Mehrere Einnahmequellen laufen in einen Topf, davon gehen Ausgaben mit beliebigen Unterposten ab. Das Sankey-Diagramm zeigt jeden Strang maßstabsgetreu — und macht sichtbar, wo der größte Hebel liegt.',
  },
  kredit: {
    titel: 'Was ein Darlehen wirklich kostet.',
    lead: 'Rate, Tilgungsplan und Zinslast eines Annuitätendarlehens — und vor allem: was am Ende der Zinsbindung an Restschuld übrig bleibt. Genau dieser Betrag entscheidet darüber, wie sicher Ihre Finanzierung ist.',
  },
  entnahme: {
    titel: 'Wie lange Ihr Depot trägt.',
    lead: 'Entnahmeplan mit korrekter Besteuerung: Steuerpflichtig ist beim Verkauf nur der enthaltene Gewinn, und dessen Anteil wächst mit jedem Jahr. Der Rechner sagt außerdem, welches Startkapital nötig wäre.',
  },
  rente: {
    titel: 'Was von der gesetzlichen Rente bleibt.',
    lead: 'Entgeltpunkte, nachgelagerte Besteuerung nach Kohorte und die Beiträge, die Rentner weiterhin zahlen — die Pflegeversicherung sogar allein. Daraus ergibt sich die Lücke zu Ihrem Wunschbetrag, in heutiger Kaufkraft.',
  },
  dividenden: {
    titel: 'Was von Ihrer Dividende ankommt.',
    lead: 'Abgeltungsteuer nach § 32d EStG: Sparer-Pauschbetrag für Einzelne und Paare, Teilfreistellung bei Fonds, Kirchensteuer und ausländische Quellensteuer. Das Depot darf aus mehreren Positionen bestehen — und der Rechner sagt umgekehrt, welches Depot ein gewünschtes Monatsnetto trägt.',
  },
};

/** Der Haftungshinweis, der zum jeweiligen Werkzeug passt. */
const HAFTUNG: Record<Reiter, string> = {
  'brutto-netto': `finpal rechnet den Lohnsteuerabzug ${JAHR} nach dem amtlichen Programmablaufplan des Bundesfinanzministeriums. Ergebnis ohne Gewähr und keine steuerliche Beratung — verbindlich ist die Abrechnung Ihres Arbeitgebers.`,
  teilzeit: `finpal rechnet den Lohnsteuerabzug ${JAHR} nach dem amtlichen Programmablaufplan des Bundesfinanzministeriums. Die Rentenwirkung ist eine Hochrechnung in heutiger Kaufkraft. Ergebnis ohne Gewähr und keine steuerliche Beratung.`,
  geldfluss: 'Der Geldfluss-Rechner ordnet allein die Zahlen, die Sie selbst eintragen — er enthält keine Steuerberechnung. Alle Beträge verstehen sich als Monatswerte.',
  dividenden: `finpal rechnet die Abgeltungsteuer ${JAHR} nach der Formel des § 32d Abs. 1 EStG. Ergebnis ohne Gewähr und keine steuerliche Beratung — maßgeblich ist die Steuerbescheinigung Ihrer Bank.`,
  kredit: 'Der Tilgungsplan rechnet mit gleichbleibender Rate und den von Ihnen angenommenen Zinsen. Nebenkosten sind nicht enthalten — maßgeblich ist das Angebot Ihrer Bank.',
  entnahme: 'Der Entnahmeplan unterstellt eine gleichmäßige Rendite. Echte Märkte schwanken, und schlechte Jahre zu Beginn wirken besonders stark. Ergebnis ohne Gewähr.',
  rente: `finpal rechnet die gesetzliche Altersrente ${JAHR} mit Entgeltpunkten, Kohortenbesteuerung und den Beiträgen der Rentner. Eine Hochrechnung unter Annahmen — verbindlich ist Ihre Renteninformation.`,
};

export default function App() {
  const [zustand, setzeZustand] = useState<Zustand>(anfangszustand);
  const [thema, setzeThemaZustand] = useState<Thema>(ladeThema);
  const [speichern, setzeSpeichern] = useState(speichernErlaubt);
  const [meldung, setzeMeldung] = useState<string | null>(null);

  const {
    eingabe, stundenIst, stundenZiel, budget, dividenden, kredit, entnahme, rente, reiter,
  } = zustand;

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
  const haushalt = useMemo(() => budgetSummen(budget), [budget]);
  const steuerlicheLage = useMemo(
    () => ({ kirchensteuer: eingabe.kirchensteuer, bundesland: eingabe.bundesland }),
    [eingabe.kirchensteuer, eingabe.bundesland],
  );
  const dividende = useMemo(
    () => berechneDividende(dividenden, steuerlicheLage),
    [dividenden, steuerlicheLage],
  );

  const patchDividenden = useCallback((teil: Partial<DividendenEingabe>) => {
    setzeZustand((alt) => ({ ...alt, dividenden: { ...alt.dividenden, ...teil } }));
  }, []);
  const patchKredit = useCallback((teil: Partial<KreditEingabe>) => {
    setzeZustand((alt) => ({ ...alt, kredit: { ...alt.kredit, ...teil } }));
  }, []);
  const patchEntnahme = useCallback((teil: Partial<EntnahmeEingabe>) => {
    setzeZustand((alt) => ({ ...alt, entnahme: { ...alt.entnahme, ...teil } }));
  }, []);
  const patchRente = useCallback((teil: Partial<RenteEingabe>) => {
    setzeZustand((alt) => ({ ...alt, rente: { ...alt.rente, ...teil } }));
  }, []);

  const darlehen = useMemo(() => berechneKredit(kredit), [kredit]);
  const entnahmePlan = useMemo(
    () => berechneEntnahme(entnahme, steuerlicheLage), [entnahme, steuerlicheLage],
  );
  const rentenlage = useMemo(
    () => berechneRente(rente, steuerlicheLage, JAHR), [rente, steuerlicheLage],
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
    if (reiter === 'geldfluss') {
      const zeilen: string[][] = [
        ['Art', 'Posten', 'Gehoert zu', 'Monat in Euro', 'Jahr in Euro'],
        ...budget.einnahmen.filter((e) => e.betrag > 0)
          .map((e) => ['Einnahme', e.name, '', num(e.betrag), num(e.betrag * 12)]),
        ...budget.ausgaben.flatMap((a) => {
          const summe = ausgabeBetrag(a);
          return [
            ['Ausgabe', a.name, '', num(summe), num(summe * 12)],
            ...a.unterposten.filter((u) => u.betrag > 0)
              .map((u) => ['Unterposten', u.name, a.name, num(u.betrag), num(u.betrag * 12)]),
          ];
        }),
        ['Summe', 'Einnahmen', '', num(haushalt.einnahmen), num(haushalt.einnahmen * 12)],
        ['Summe', 'Ausgaben', '', num(haushalt.ausgaben), num(haushalt.ausgaben * 12)],
        ['Summe', haushalt.saldo < 0 ? 'Fehlbetrag' : 'Bleibt uebrig', '',
          num(haushalt.saldo), num(haushalt.saldo * 12)],
      ];
      const inhalt = zeilen.map((z) => z.map((f) => `"${f.replace(/"/g, '""')}"`).join(';')).join('\r\n');
      ladeDateiHerunter(`finpal-geldfluss-${JAHR}.csv`, inhalt, 'text/csv');
      setzeMeldung('CSV im Browser erzeugt — ohne Umweg über einen Server');
      return;
    }

    if (reiter === 'dividenden') {
      const zeilen: string[][] = [
        ['Posten', 'Jahr in Euro', 'Monat in Euro'],
        ['Bruttodividende', num(dividende.bruttoJahr), num(dividende.bruttoMonat)],
        ['Teilfreistellung', num(dividende.teilfreigestellt), num(dividende.teilfreigestellt / 12)],
        ['Sparer-Pauschbetrag genutzt', num(dividende.pauschbetragGenutzt), ''],
        ['Steuerpflichtiger Betrag', num(dividende.bemessungsgrundlage), ''],
        ['Auslaendische Quellensteuer', num(dividende.quellensteuer), num(dividende.quellensteuer / 12)],
        ['Kapitalertragsteuer', num(dividende.kapitalertragsteuer), num(dividende.kapitalertragsteuer / 12)],
        ['Solidaritaetszuschlag', num(dividende.soli), num(dividende.soli / 12)],
        ['Kirchensteuer', num(dividende.kirchensteuer), num(dividende.kirchensteuer / 12)],
        ['Steuern gesamt', num(dividende.steuernGesamt), num(dividende.steuernGesamt / 12)],
        ['Nettodividende', num(dividende.nettoJahr), num(dividende.nettoMonat)],
        ['Depotwert', dividende.portfolio === null ? '' : num(dividende.portfolio), ''],
        ...dividende.positionen.map((pos) => [
          `Position: ${pos.name || ANLAGEART_MAP[pos.anlageart].name}`,
          num(pos.bruttoJahr),
          `${num(pos.anteil)} % Anteil, ${pos.rendite === null ? '' : num(pos.rendite)} % Rendite`,
        ]),
      ];
      const inhalt = zeilen.map((z) => z.map((f) => `"${f.replace(/"/g, '""')}"`).join(';')).join('\r\n');
      ladeDateiHerunter(`finpal-dividenden-${JAHR}.csv`, inhalt, 'text/csv');
      setzeMeldung('CSV im Browser erzeugt — ohne Umweg über einen Server');
      return;
    }

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

  // Ein Beispielsatz, der zum gewählten Werkzeug gehört.
  const beispielZeile = reiter === 'brutto-netto'
    ? `Beispiel: ${eur(abrechnung.brutto.monat)} brutto in Steuerklasse ${abrechnung.eingabe.steuerklasse} ergeben ${eur(abrechnung.netto.monat)} netto — eine Abgabenquote von ${prozent(abrechnung.abgabenquote)}.`
    : reiter === 'teilzeit'
      ? `Beispiel: Von ${fmtStunden(stundenIst)} auf ${fmtStunden(stundenZiel)} Wochenstunden kostet ${eur(teilzeit.nettoVerlustMonat)} netto im Monat — bei ${eur(teilzeit.bruttoVerlustMonat)} weniger brutto.`
      : reiter === 'geldfluss'
        ? `Beispiel: Von ${eur(haushalt.einnahmen)} Einnahmen gehen ${eur(haushalt.ausgaben)} für Ausgaben ab — ${haushalt.saldo < 0 ? `es fehlen ${eur(-haushalt.saldo)}` : `übrig bleiben ${eur(haushalt.saldo)}`}.`
        : reiter === 'dividenden'
          ? `Beispiel: ${dividende.portfolio === null ? eur(dividende.bruttoJahr) + ' Bruttodividende' : eur(dividende.portfolio) + ' Depot'} ergeben ${eur(dividende.nettoMonat)} netto im Monat — nach ${prozent(dividende.effektiverSteuersatz)} Steuern.`
          : reiter === 'kredit'
            ? `Beispiel: ${eur(kredit.darlehen)} zu ${kredit.sollzins} % ergeben ${eur(darlehen.monatsrate)} Rate — nach ${kredit.zinsbindung} Jahren stehen noch ${eur(darlehen.restschuldNachBindung)} offen.`
            : reiter === 'entnahme'
              ? `Beispiel: ${eur(entnahme.startkapital)} tragen ${eur(entnahme.entnahmeNettoMonat)} netto im Monat ${entnahmePlan.traegtDurch ? `über ${entnahme.dauerJahre} Jahre` : `rund ${Math.round((entnahmePlan.reichweiteMonate ?? 0) / 12)} Jahre`}.`
              : `Beispiel: ${num(rentenlage.entgeltpunkteGesamt)} Entgeltpunkte ergeben ${eur(rentenlage.bruttoRenteMonat)} brutto — davon bleiben ${eur(rentenlage.nettoRenteMonat)} netto.`;

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
              <span className="brand__claim"> · Gehalt, Haushalt und Depot für {JAHR}</span>
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
          <h1 className="hero__title">{HERO[reiter].titel}</h1>
          <p className="hero__lead">{HERO[reiter].lead}</p>
          <div className="hero__facts">
            <span className="fact"><IconShield />Keine Übertragung Ihrer Daten</span>
            <span className="fact"><IconOffline />Funktioniert offline</span>
            {reiter === 'brutto-netto' && (
              <span className="fact"><IconScale />Amtlicher Rechenkern {JAHR}</span>
            )}
            {reiter === 'teilzeit' && (
              <span className="fact"><IconClock />Amtlicher Rechenkern inklusive Rentenwirkung</span>
            )}
            {reiter === 'geldfluss' && (
              <span className="fact"><IconFlow />Sankey-Diagramm mit Unterposten</span>
            )}
            {reiter === 'dividenden' && (
              <span className="fact"><IconCoin />Abgeltungsteuer nach § 32d EStG</span>
            )}
            {reiter === 'kredit' && (
              <span className="fact"><IconScale />Restschuld und Anschlusszins im Blick</span>
            )}
            {reiter === 'entnahme' && (
              <span className="fact"><IconCoin />Besteuerung nur des Gewinnanteils</span>
            )}
            {reiter === 'rente' && (
              <span className="fact"><IconClock />Kohortenbesteuerung und Rentnerbeiträge</span>
            )}
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="Rechner wählen">
          {REITER.map((r) => (
            <button
              key={r.wert}
              type="button" role="tab" className="tab"
              aria-selected={reiter === r.wert}
              title={r.titel}
              onClick={() => setzeZustand((alt) => ({ ...alt, reiter: r.wert }))}
            >
              {r.kurz}
            </button>
          ))}
        </div>

        <div className="layout">
          <div className="layout__inputs">
            {reiter === 'kredit' ? (
              <Card title="Ihre Angaben" note={`${eur(darlehen.monatsrate)} im Monat`}>
                <KreditFormular werte={kredit} patch={patchKredit} />
              </Card>
            ) : reiter === 'entnahme' ? (
              <Card title="Ihre Angaben" note={entnahmePlan.traegtDurch ? 'trägt durch' : 'reicht nicht'}>
                <EntnahmeFormular werte={entnahme} patch={patchEntnahme} />
              </Card>
            ) : reiter === 'rente' ? (
              <Card title="Ihre Angaben" note={`Rentenbeginn ${rentenlage.rentenbeginnJahr}`}>
                <RenteFormular
                  werte={rente}
                  patch={patchRente}
                  person={eingabe}
                  patchPerson={patch}
                />
              </Card>
            ) : reiter === 'dividenden' ? (
              <Card title="Ihre Angaben" note={`${eur(dividende.bruttoJahr)} brutto`}>
                <DividendenFormular
                  werte={dividenden}
                  patch={patchDividenden}
                  person={eingabe}
                  patchPerson={patch}
                  bruttoJahr={dividende.bruttoJahr}
                />
              </Card>
            ) : reiter === 'geldfluss' ? (
              <Card title="Ihr Haushalt" note={`${eur(haushalt.einnahmen)} ein`}>
                <BudgetFormular
                  budget={budget}
                  setzeBudget={(neu) => setzeZustand((alt) => ({ ...alt, budget: neu }))}
                  nettoVorschlag={abrechnung.netto.monat}
                />
              </Card>
            ) : (
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
            )}
            <Werkzeugleiste onTeilen={teilen} onCsv={csv} onZuruecksetzen={zuruecksetzen} />
          </div>

          <div className="layout__results">
            {reiter === 'brutto-netto' && <BruttoNettoAnsicht ergebnis={abrechnung} />}
            {reiter === 'teilzeit' && (
              <TeilzeitAnsicht
                ergebnis={teilzeit}
                stundenIst={stundenIst}
                stundenZiel={stundenZiel}
                setzeStundenIst={(wert) => setzeZustand((alt) => ({ ...alt, stundenIst: wert }))}
                setzeStundenZiel={(wert) => setzeZustand((alt) => ({ ...alt, stundenZiel: wert }))}
              />
            )}
            {reiter === 'geldfluss' && <GeldflussAnsicht budget={budget} />}
            {reiter === 'dividenden' && (
              <DividendenAnsicht eingabe={dividenden} lage={steuerlicheLage} />
            )}
            {reiter === 'kredit' && <KreditAnsicht eingabe={kredit} />}
            {reiter === 'entnahme' && <EntnahmeAnsicht eingabe={entnahme} lage={steuerlicheLage} />}
            {reiter === 'rente' && <RenteAnsicht eingabe={rente} lage={steuerlicheLage} />}
          </div>
        </div>

        <div className="cols" style={{ marginTop: 32 }}>
          <PrivatsphaereKarte speichern={speichern} setzeSpeichern={schalteSpeichern} />
          <RechengroessenKarte reiter={reiter} />
        </div>

        <div style={{ marginTop: 16 }}>
          <MethodikKarte reiter={reiter} />
        </div>

        <footer className="footer">
          <p>{HAFTUNG[reiter]}</p>
          <p>{beispielZeile}</p>
        </footer>
      </main>

      {meldung && <div className="toast" role="status">{meldung}</div>}
    </>
  );
}
