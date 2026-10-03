import { JAHR, PAP_STAND, RENTE, STEUER, SV } from '../lib/constants';
import { eur, num } from '../lib/format';
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
            <div className="trust__title">Kein Server sieht Ihr Gehalt</div>
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

export function MethodikKarte() {
  return (
    <Card title={`Wie gerechnet wird — Rechtsstand ${JAHR}`}>
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
          <li>
            Steuerklassen I bis VI samt dem Sondertarif für V und VI sowie Steuerklasse IV mit Faktor
          </li>
          <li>
            Solidaritätszuschlag mit Freigrenze {num(STEUER.soliFreigrenze)} € Jahreslohnsteuer und
            Milderungszone
          </li>
          <li>
            Kirchensteuer mit 8 % in Bayern und Baden-Württemberg, sonst 9 %
          </li>
          <li>
            Kranken-, Pflege-, Renten- und Arbeitslosenversicherung mit den Beitragsbemessungs­grenzen {JAHR},
            dem Pflegezuschlag für Kinderlose, den Abschlägen ab dem zweiten Kind und der
            sächsischen Sonderregel
          </li>
          <li>
            Minijob und Übergangsbereich (§ 20 Abs. 2a SGB IV) mit gleitend steigendem
            Arbeitnehmeranteil
          </li>
          <li>
            Private Kranken- und Pflegeversicherung mit begrenztem Arbeitgeberzuschuss
          </li>
        </ul>
        <p>
          <strong>Nicht enthalten:</strong> Einmalzahlungen und sonstige Bezüge wie Weihnachtsgeld,
          Versorgungsbezüge, geldwerte Vorteile (Dienstwagen, Sachbezüge), vermögenswirksame
          Leistungen, betriebliche Altersversorgung, die Kappung der Kirchensteuer in einigen
          Bundesländern, Umlagen U1/U2 sowie die Unfallversicherung. Maßgeblich bleibt immer die
          Abrechnung Ihres Arbeitgebers; dies ist keine steuerliche Beratung.
        </p>
      </div>
    </Card>
  );
}

export function RechengroessenKarte() {
  return (
    <Card title={`Rechengrößen ${JAHR}`}>
      <div className="kv">
        {[
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
          ['Durchschnittsentgelt Rente', `${num(RENTE.durchschnittsentgelt)} € / Jahr`],
          ['Rentenwert je Entgeltpunkt', `${num(RENTE.rentenwert)} € / Monat`],
        ].map(([schluessel, wert]) => (
          <div className="kv__row" key={schluessel}>
            <span className="kv__key">{schluessel}</span>
            <span className="kv__val">{wert}</span>
          </div>
        ))}
      </div>
      <p className="field__hint" style={{ marginTop: 12 }}>
        Die Beitragsbemessungsgrenzen sind seit 2025 bundesweit einheitlich. Das Bundesland wirkt
        sich daher nur noch über die Kirchensteuer und — in Sachsen — über die Aufteilung des
        Pflegebeitrags aus.
      </p>
    </Card>
  );
}
