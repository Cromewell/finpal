import {
  ANLAGEARTEN, JAHR, KAPITAL, PAP_STAND, RENTE, STEUER, SV,
} from '../lib/constants';
import { eur, num, numFlex } from '../lib/format';
import { nutztLohnsteuer, type Reiter } from '../reiter';
import { Card, IconOffline, IconScale, IconShield, Switch } from './ui';

export function PrivatsphaereKarte({
  speichern, setzeSpeichern,
}: {
  speichern: boolean;
  setzeSpeichern: (wert: boolean) => void;
}) {
  return (
    <Card title="Ihre Daten bleiben hier">
      <div className="trust">
        <div className="trust__item">
          <span className="trust__icon"><IconShield size={16} /></span>
          <div>
            <div className="trust__title">Kein Server sieht Ihre Zahlen</div>
            <p className="trust__text">
              Die gesamte Berechnung läuft als JavaScript in Ihrem Browser. Ihre Eingaben werden
              nicht übertragen, nicht protokolliert und nicht gespeichert.
            </p>
          </div>
        </div>
        <div className="trust__item">
          <span className="trust__icon"><IconOffline size={16} /></span>
          <div>
            <div className="trust__title">Funktioniert ohne Internet</div>
            <p className="trust__text">
              Nach dem ersten Laden arbeitet die Seite offline weiter. Sie können die
              Netzwerkverbindung trennen und weiterrechnen — der beste Beweis, dass nichts abfließt.
            </p>
          </div>
        </div>
        <div className="trust__item">
          <span className="trust__icon"><IconScale size={16} /></span>
          <div>
            <div className="trust__title">Keine Zählpixel, keine Cookies</div>
            <p className="trust__text">
              Keine Analyse-Werkzeuge, keine Einbindungen von Dritten, keine Schriftarten von
              fremden Servern. Deshalb gibt es auch kein Einwilligungsbanner.
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <Switch
          label="Eingaben auf diesem Gerät merken"
          hint="Standardmäßig aus. Eingeschaltet liegen die Werte allein im Speicher dieses Browsers — abschalten löscht sie sofort."
          checked={speichern}
          onChange={setzeSpeichern}
        />
      </div>
    </Card>
  );
}

/** Die Rechengrößen, die das jeweils gewählte Werkzeug tatsächlich verwendet. */
function groessenFuer(reiter: Reiter): [string, string][] {
  const lohn: [string, string][] = [
    ['Grundfreibetrag', `${num(STEUER.grundfreibetrag)} € / Jahr`],
    ['Spitzensteuersatz ab', `${num(STEUER.spitzensteuersatzAb)} € / Jahr`],
    ['Beitragsbemessungsgrenze KV / PV', `${eur(SV.bbgKvPvJahr / 12)} / Monat`],
    ['Beitragsbemessungsgrenze RV / AV', `${eur(SV.bbgRvAvJahr / 12)} / Monat`],
    ['Versicherungspflichtgrenze GKV', `${num(SV.jaegJahr)} € / Jahr`],
    ['Krankenversicherung', `14,6 % + Zusatzbeitrag (Ø ${num(SV.kvZusatzbeitragDurchschnitt)} %)`],
    ['Pflegeversicherung', '3,6 % — Kinderlose 4,2 %'],
    ['Rentenversicherung', '18,6 %'],
    ['Arbeitslosenversicherung', '2,6 %'],
    ['Minijob-Grenze', `${num(SV.minijobGrenze)} € / Monat`],
    ['Übergangsbereich bis', `${num(SV.uebergangsbereichObergrenze)} € / Monat`],
  ];

  if (reiter === 'brutto-netto') return lohn;

  if (reiter === 'teilzeit') {
    return [
      ...lohn,
      ['Durchschnittsentgelt Rente', `${num(RENTE.durchschnittsentgelt)} € / Jahr`],
      ['Rentenwert je Entgeltpunkt', `${num(RENTE.rentenwert)} € / Monat`],
    ];
  }

  if (reiter === 'rente') {
    return [
      ['Durchschnittsentgelt Rente', `${num(RENTE.durchschnittsentgelt)} € / Jahr`],
      ['Rentenwert je Entgeltpunkt', `${num(RENTE.rentenwert)} € / Monat`],
      ['Beitragsbemessungsgrenze RV', `${num(SV.bbgRvAvJahr)} € / Jahr`],
      ['Regelaltersgrenze ab Jahrgang 1964', '67 Jahre'],
      ['Besteuerungsanteil bei Rentenbeginn 2026', '84,0 %'],
      ['Anstieg je späterem Rentenjahr', '0,5 Punkte, bis 100 % ab 2058'],
      ['Krankenversicherung der Rentner', `7,3 % + halber Zusatzbeitrag (Ø ${num(SV.kvZusatzbeitragDurchschnitt)} %)`],
      ['Pflegeversicherung der Rentner', '3,6 % allein getragen — kinderlos 4,2 %'],
      ['Grundfreibetrag', `${num(STEUER.grundfreibetrag)} € / Jahr`],
    ];
  }

  if (reiter === 'entnahme') {
    return [
      ['Sparer-Pauschbetrag einzeln', `${num(KAPITAL.sparerPauschbetrag)} € / Jahr`],
      ['Sparer-Pauschbetrag zusammen', `${num(KAPITAL.sparerPauschbetragZusammen)} € / Jahr`],
      ['Abgeltungsteuer', '25 %'],
      ['Solidaritätszuschlag', '5,5 % der Kapitalertragsteuer'],
      ['Kirchensteuer', '8 % in Bayern und Baden-Württemberg, sonst 9 %'],
      ...ANLAGEARTEN
        .filter((a) => a.teilfreistellung > 0)
        .map((a) => [`Teilfreistellung ${a.name}`, `${numFlex(a.teilfreistellung * 100)} %`] as [string, string]),
    ];
  }

  if (reiter === 'dividenden') {
    return [
      ['Sparer-Pauschbetrag einzeln', `${num(KAPITAL.sparerPauschbetrag)} € / Jahr`],
      ['Sparer-Pauschbetrag zusammen', `${num(KAPITAL.sparerPauschbetragZusammen)} € / Jahr`],
      ['Abgeltungsteuer', '25 %'],
      ['Solidaritätszuschlag', '5,5 % der Kapitalertragsteuer'],
      ['Kirchensteuer', '8 % in Bayern und Baden-Württemberg, sonst 9 %'],
      ...ANLAGEARTEN
        .filter((a) => a.teilfreistellung > 0)
        .map((a) => [`Teilfreistellung ${a.name}`, `${numFlex(a.teilfreistellung * 100)} %`] as [string, string]),
      ['Anrechnung ausländischer Steuer', `meist bis ${numFlex(KAPITAL.quellensteuerAnrechnungStandard)} %`],
    ];
  }

  return [];
}

export function RechengroessenKarte({ reiter }: { reiter: Reiter }) {
  const zeilen = groessenFuer(reiter);
  // Der Geldfluss-Rechner arbeitet allein mit Ihren eigenen Zahlen — es gibt
  // dort keine gesetzlichen Größen zu zeigen.
  if (zeilen.length === 0) return null;

  return (
    <Card title={`Rechengrößen ${JAHR}`}>
      <div className="kv">
        {zeilen.map(([schluessel, wert]) => (
          <div className="kv__row" key={schluessel}>
            <span className="kv__key">{schluessel}</span>
            <span className="kv__val">{wert}</span>
          </div>
        ))}
      </div>
      {nutztLohnsteuer(reiter) && (
        <p className="field__hint" style={{ marginTop: 12 }}>
          Die Beitragsbemessungsgrenzen sind seit 2025 bundesweit einheitlich. Das Bundesland wirkt
          sich daher nur noch über die Kirchensteuer und — in Sachsen — über die Aufteilung des
          Pflegebeitrags aus.
        </p>
      )}
    </Card>
  );
}

function LohnsteuerMethodik({ teilzeit }: { teilzeit: boolean }) {
  return (
    <div className="prose">
      <p>
        Die Lohnsteuer stammt nicht aus einer Nachbildung, sondern aus dem{' '}
        <strong>amtlichen Programmablaufplan des Bundesfinanzministeriums</strong> für {JAHR}
        {' '}(Stand {PAP_STAND}). Dessen maschinenlesbare Fassung wurde unverändert übernommen und
        mit exakter Dezimalarithmetik umgesetzt — die Ergebnisse stimmen centgenau mit dem
        offiziellen Rechner überein. Geprüft wird das gegen 207 Testfälle aus der amtlichen
        Schnittstelle.
      </p>
      <p>Enthalten sind:</p>
      <ul>
        <li>
          Lohnsteuer nach dem Einkommensteuertarif {JAHR} (§ 32a EStG) mit Grundfreibetrag{' '}
          {num(STEUER.grundfreibetrag)} €, Arbeitnehmer-Pauschbetrag {num(STEUER.arbeitnehmerPauschbetrag)} €,
          Vorsorgepauschale, Entlastungsbetrag für Alleinerziehende und Altersentlastungsbetrag
        </li>
        <li>Steuerklassen I bis VI samt dem Sondertarif für V und VI sowie Steuerklasse IV mit Faktor</li>
        <li>
          Solidaritätszuschlag mit Freigrenze {num(STEUER.soliFreigrenze)} € Jahreslohnsteuer und
          Milderungszone
        </li>
        <li>Kirchensteuer mit 8 % in Bayern und Baden-Württemberg, sonst 9 %</li>
        <li>
          Kranken-, Pflege-, Renten- und Arbeitslosenversicherung mit den Beitragsbemessungs­grenzen {JAHR},
          dem Pflegezuschlag für Kinderlose, den Abschlägen ab dem zweiten Kind und der
          sächsischen Sonderregel
        </li>
        <li>
          Minijob und Übergangsbereich (§ 20 Abs. 2a SGB IV) mit gleitend steigendem
          Arbeitnehmeranteil
        </li>
        <li>Private Kranken- und Pflegeversicherung mit begrenztem Arbeitgeberzuschuss</li>
      </ul>

      {teilzeit && (
        <>
          <p>
            Für die Stundenreduktion kommt hinzu: Das Brutto sinkt genau im Verhältnis der Stunden,
            der Stundenlohn bleibt also gleich. Zulagen, Boni oder eine Aufstockung durch den
            Arbeitgeber sind nicht berücksichtigt.
          </p>
          <p>
            Die Rentenwirkung rechnet mit Entgeltpunkten: beitragspflichtiges Jahresbrutto geteilt
            durch das vorläufige Durchschnittsentgelt von {num(RENTE.durchschnittsentgelt)} €,
            bewertet mit dem aktuellen Rentenwert von {num(RENTE.rentenwert)} €. Im Minijob mit
            Befreiung von der Rentenversicherungspflicht zählt nur der Anteil aus dem
            15-%-Pauschalbeitrag des Arbeitgebers. Die Beträge zeigen heutige Kaufkraft, nicht Ihre
            spätere Rente.
          </p>
        </>
      )}

      <p>
        <strong>Nicht enthalten:</strong> Einmalzahlungen und sonstige Bezüge wie Weihnachtsgeld,
        Versorgungsbezüge, geldwerte Vorteile (Dienstwagen, Sachbezüge), vermögenswirksame
        Leistungen, betriebliche Altersversorgung, die Kappung der Kirchensteuer in einigen
        Bundesländern, Umlagen U1/U2 sowie die Unfallversicherung. Maßgeblich bleibt immer die
        Abrechnung Ihres Arbeitgebers; dies ist keine steuerliche Beratung.
      </p>
    </div>
  );
}

function KreditMethodik() {
  return (
    <div className="prose">
      <p>
        Gerechnet wird ein <strong>Annuitätendarlehen</strong>: Die Rate bleibt gleich, doch ihre
        Zusammensetzung verschiebt sich. Anfangs ist fast alles Zins; mit sinkender Restschuld
        fällt der Zinsanteil und die Tilgung steigt.
      </p>
      <ul>
        <li>
          Die Rate ergibt sich aus Darlehen × (Sollzins + Anfangstilgung) ÷ 12 — oder Sie geben
          sie direkt vor, dann wird die Tilgung daraus zurückgerechnet.
        </li>
        <li>
          Zinsen werden monatlich auf die jeweilige Restschuld berechnet. Deshalb liegt der
          effektive Jahreszins stets über dem Sollzins.
        </li>
        <li>
          Nach Ablauf der Zinsbindung rechnet das Werkzeug mit dem von Ihnen angenommenen
          Anschlusszins weiter — bei gleichbleibender Rate.
        </li>
        <li>Sondertilgungen werden zum Jahresende verrechnet.</li>
      </ul>
      <p>
        <strong>Nicht enthalten:</strong> Disagio, Bearbeitungs- und Schätzgebühren, Bereitstellungszinsen
        sowie die Kaufnebenkosten (Grunderwerbsteuer, Notar, Makler). Der ausgewiesene Effektivzins
        folgt daher allein aus der monatlichen Verzinsung; maßgeblich ist der Effektivzins im
        Angebot Ihrer Bank.
      </p>
    </div>
  );
}

function EntnahmeMethodik() {
  return (
    <div className="prose">
      <p>
        Beim Verkauf von Anteilen ist <strong>nicht die Entnahme steuerpflichtig, sondern allein
        der darin enthaltene Gewinn</strong> — also der Teil, der über den Einstandswert
        hinausgeht. Dieser Anteil ist zu Beginn klein und wächst mit jedem Jahr. Rechner, die
        pauschal die ganze Entnahme oder gar nichts besteuern, liegen deshalb systematisch daneben.
      </p>
      <ul>
        <li>
          Verkauft wird anteilig über das Depot; der Einstandswert sinkt im selben Verhältnis.
        </li>
        <li>
          Auf den realisierten Gewinn wirken Teilfreistellung nach § 20 InvStG, der
          Sparer-Pauschbetrag einmal im Jahr und die Formel des § 32d Abs. 1 EStG.
        </li>
        <li>
          Die Entnahme ist als <em>Nettobetrag</em> angegeben. Der Rechner ermittelt, wie viel
          brutto verkauft werden muss, damit nach Steuern genau dieser Betrag übrig bleibt.
        </li>
        <li>
          Mit der Inflationsanpassung steigt die Entnahme jährlich, damit die Kaufkraft erhalten
          bleibt.
        </li>
      </ul>
      <p>
        <strong>Nicht enthalten:</strong> die Vorabpauschale bei thesaurierenden Fonds,
        Verlustverrechnungstöpfe und Transaktionskosten. Unterstellt ist außerdem eine
        gleichmäßige Rendite — echte Märkte schwanken, und schlechte Jahre zu Beginn der Entnahme
        wirken deutlich stärker als späte.
      </p>
    </div>
  );
}

function RenteMethodik() {
  return (
    <div className="prose">
      <p>
        Die gesetzliche Rente ergibt sich aus <strong>Entgeltpunkten mal Rentenwert</strong>. Einen
        Entgeltpunkt erhält, wer ein Jahr lang genau das Durchschnittsentgelt verdient; über der
        Beitragsbemessungsgrenze entstehen keine weiteren Punkte.
      </p>
      <p>Zwei Posten fehlen in den meisten Überschlagsrechnungen, und beide kosten spürbar:</p>
      <ul>
        <li>
          <strong>Nachgelagerte Besteuerung.</strong> Wie viel der Rente steuerpflichtig ist,
          richtet sich nach dem Jahr des Rentenbeginns — 84 % bei Beginn 2026, je späterem Jahr
          0,5 Punkte mehr bis 100 % ab 2058. Der Anteil bleibt danach lebenslang unverändert,
          spätere Rentenerhöhungen sind voll zu versteuern.
        </li>
        <li>
          <strong>Beiträge im Ruhestand.</strong> Rentner zahlen weiterhin Krankenversicherung
          (7,3 % plus den halben Zusatzbeitrag) und <em>Pflegeversicherung in voller Höhe allein</em>.
          Beide Beiträge sind als Sonderausgaben abziehbar, was die Steuer wieder etwas senkt.
        </li>
      </ul>
      <p>
        Die Einkommensteuer wird mit dem Tarif des § 32a EStG gerechnet, nach Abzug des
        Werbungskosten-Pauschbetrags von 102 €, des Sonderausgaben-Pauschbetrags und der Beiträge.
      </p>
      <p>
        <strong>Nicht enthalten:</strong> betriebliche und private Vorsorge, Abschläge bei
        vorzeitigem Rentenbeginn, Zurechnungs- und Kindererziehungszeiten sowie weitere Einkünfte
        im Ruhestand. Verbindlich ist Ihre Renteninformation.
      </p>
    </div>
  );
}

function GeldflussMethodik() {
  return (
    <div className="prose">
      <p>
        Dieser Rechner enthält <strong>keine Steuerberechnung</strong>. Er ordnet allein die Zahlen,
        die Sie selbst eintragen: Einnahmen fließen in einen gemeinsamen Topf, von dem die Ausgaben
        abgehen.
      </p>
      <ul>
        <li>
          Hat eine Ausgabe Unterposten, ergibt sich ihr Betrag aus deren Summe; ohne Unterposten
          gilt der eingetragene Betrag.
        </li>
        <li>
          Was von den Einnahmen übrig bleibt, erscheint als eigener Strang. Reichen sie nicht,
          wird die Lücke links als Quelle „Aus Rücklagen“ sichtbar — so bleibt das Bild
          ausgeglichen, statt einen negativen Posten zu zeigen.
        </li>
        <li>
          Die Breite jedes Bandes entspricht genau seinem Betrag. In der Darstellung
          <em> bündig</em> füllen die Unterposten das Band ihrer Ausgabe exakt aus;
          <em> aufgefächert</em> rücken die Enden auseinander, damit jede Beschriftung lesbar bleibt.
        </li>
      </ul>
      <p>
        Alle Beträge verstehen sich als <strong>Monatswerte</strong>. Posten, die nur einmal im Jahr
        anfallen — Versicherungen, Urlaub, Reparaturen —, tragen Sie am besten mit einem Zwölftel
        ein; sonst zeigt das Bild einen Monat, den es so nie gibt.
      </p>
      <p>
        Ein Netto aus dem Brutto-Netto-Rechner lässt sich mit einem Klick als Einnahme übernehmen.
      </p>
    </div>
  );
}

function DividendenMethodik() {
  return (
    <div className="prose">
      <p>
        Gerechnet wird die <strong>Abgeltungsteuer auf private Kapitalerträge</strong> nach der
        gesetzlichen Formel des § 32d Abs. 1 EStG:
      </p>
      <p style={{ fontVariantNumeric: 'tabular-nums' }}>
        <strong>Kapitalertragsteuer = (e − 4q) / (4 + k)</strong>
      </p>
      <p>
        Dabei ist <em>e</em> der steuerpflichtige Ertrag, <em>q</em> die anrechenbare ausländische
        Steuer und <em>k</em> der Kirchensteuersatz. Die oft zu lesende Rechnung „25 % plus 5,5 %
        Soli plus 9 % Kirchensteuer“ ergäbe 28,63 % — richtig sind 27,99 %: Weil die Kirchensteuer
        als Sonderausgabe abziehbar ist, mindert sie die Kapitalertragsteuer selbst.
      </p>
      <p>Enthalten sind:</p>
      <ul>
        <li>
          Sparer-Pauschbetrag von {num(KAPITAL.sparerPauschbetrag)} € einzeln und{' '}
          {num(KAPITAL.sparerPauschbetragZusammen)} € bei Zusammenveranlagung — er gilt einmal für
          alle Positionen zusammen, nicht je Position
        </li>
        <li>
          Teilfreistellung nach § 20 InvStG: 30 % bei Aktienfonds, 15 % bei Mischfonds, 60 bzw.
          80 % bei Immobilienfonds — sie wirkt je Position
        </li>
        <li>
          Ausländische Quellensteuer bei direkt gehaltenen Aktien, anrechenbar bis zum Höchstsatz
          des Doppelbesteuerungsabkommens. Bei Fonds entfällt sie, weil sie bereits auf Fondsebene
          verrechnet wird.
        </li>
        <li>
          Depots aus mehreren Positionen mit eigener Rendite, Anlageart und Quellensteuer
        </li>
      </ul>
      <p>
        <strong>Nicht enthalten:</strong> Kursgewinne, die Vorabpauschale bei thesaurierenden
        Fonds, Verlustverrechnungstöpfe und die Günstigerprüfung. Liegt Ihr persönlicher Steuersatz
        unter 25 %, können Sie diese über die Steuererklärung beantragen und zahlen dann weniger.
        Dies ist keine steuerliche Beratung.
      </p>
    </div>
  );
}

export function MethodikKarte({ reiter }: { reiter: Reiter }) {
  const ohneRechtsstand = reiter === 'geldfluss' || reiter === 'kredit';
  const titel = ohneRechtsstand
    ? 'Wie gerechnet wird'
    : `Wie gerechnet wird — Rechtsstand ${JAHR}`;

  return (
    <Card title={titel}>
      {reiter === 'geldfluss' && <GeldflussMethodik />}
      {reiter === 'dividenden' && <DividendenMethodik />}
      {reiter === 'kredit' && <KreditMethodik />}
      {reiter === 'entnahme' && <EntnahmeMethodik />}
      {reiter === 'rente' && <RenteMethodik />}
      {nutztLohnsteuer(reiter) && <LohnsteuerMethodik teilzeit={reiter === 'teilzeit'} />}
    </Card>
  );
}
