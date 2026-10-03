# finpal

**Brutto-Netto-, Teilzeit-, Haushalts- und Dividendenrechner für Deutschland —
Rechtsstand 2026.** Alles rechnet im Browser. Keine Übertragung, kein Server,
keine Zählpixel.

Vier Werkzeuge in einer Anwendung:

1. **Brutto-Netto-Rechner** — alle sechs Steuerklassen, alle sechzehn Bundesländer,
   gesetzliche und private Krankenversicherung, Minijob und Übergangsbereich.
2. **Teilzeit-Rechner** — was eine geplante Stundenreduktion wirklich kostet:
   netto, aufs Jahr gerechnet, je aufgegebener Wochenstunde und in Rentenpunkten.
3. **Geldfluss** — ein Sankey-Diagramm des Haushalts: mehrere Einnahmequellen
   fließen in einen Topf, davon gehen Ausgaben mit beliebigen Unterposten ab.
   Reicht das Geld nicht, erscheint die Lücke als eigene Quelle „Aus Rücklagen“.
   Zwei Darstellungen: **bündig** (Unterposten liegen genau im Band ihrer
   Ausgabe) und **aufgefächert** (die Enden rücken auseinander, sodass jede
   Beschriftung lesbar bleibt — auch auf schmalen Geräten).
4. **Dividenden** — Abgeltungsteuer auf Kapitalerträge: Sparer-Pauschbetrag für
   Einzelne und Paare, Teilfreistellung bei Fonds, Kirchensteuer, ausländische
   Quellensteuer. Rechnet wahlweise aus einem Betrag oder aus Depotwert mal
   Dividendenrendite — und sagt umgekehrt, welches Depot ein gewünschtes
   Monatsnetto trägt.

---

## Warum die Zahlen stimmen

Der steuerliche Kern ist **keine Nachbildung**. Er ist eine 1:1-Umsetzung des
amtlichen *Programmablaufplans für die maschinelle Berechnung der Lohnsteuer 2026*
(BMF / ITZBund, Stand 23.10.2025).

| | |
|---|---|
| Quelle | [`vendor/Lohnsteuer2026.xml`](vendor/Lohnsteuer2026.xml) — die amtliche, maschinenlesbare Fassung |
| Erzeugt mit | [LstGen](https://github.com/jenner/LstGen) → [`src/lib/lohnsteuer2026.generated.js`](src/lib/lohnsteuer2026.generated.js) |
| Arithmetik | eigene, exakte Dezimalrechnung auf BigInt ([`bigdecimal.ts`](src/lib/bigdecimal.ts)) — keine Fließkomma-Fehler |
| Geprüft gegen | 207 Testvektoren, die gegen die offizielle BMF-Schnittstelle abgeglichen wurden |

Die Testvektoren laufen bei jedem `test`-Durchlauf mit und müssen **centgenau**
stimmen. Weicht eine einzige Stelle ab, schlägt der Build fehl.

Die Sozialversicherung ist von Hand umgesetzt und in
[`sozialversicherung.ts`](src/lib/sozialversicherung.ts) dokumentiert — mit
eigenen Tests für die Beitragsbemessungsgrenzen, die sächsische Sonderregel, den
Pflegezuschlag für Kinderlose, den Übergangsbereich und den Minijob.

Das Sankey-Layout in [`sankey.ts`](src/lib/sankey.ts) ist eine reine Funktion und
entsprechend geprüft: Die Menge bleibt über alle Spalten erhalten, Knotenhöhen
stehen streng im Verhältnis zum Betrag, Knoten überlappen einander nicht, bündig
füllen die Unterposten das Band ihrer Ausgabe exakt aus — und aufgefächert hält
jedes Ende den Mindestabstand ein, den seine Beschriftung braucht.

Die Kategorienamen stehen links vom Knoten, also auf ihrem eigenen Zufluss.
Rechts lägen sie auf den Bändern ihrer Unterposten und würden eine Zuordnung
suggerieren, die nicht stimmt.

### Dividenden: die Formel, die sonst gern vereinfacht wird

Fast überall liest man „25 % Abgeltungsteuer plus 5,5 % Soli plus 9 %
Kirchensteuer“ — das ergäbe 28,63 %. Richtig sind **27,99 %**: Weil die
Kirchensteuer als Sonderausgabe abziehbar ist, mindert sie die
Kapitalertragsteuer selbst. § 32d Abs. 1 EStG schreibt dafür eine eigene Formel
vor, die hier unverändert umgesetzt ist:

```
Kapitalertragsteuer = (e − 4q) / (4 + k)
```

mit `e` = steuerpflichtiger Ertrag, `q` = anrechenbare ausländische Steuer,
`k` = Kirchensteuersatz. Die Formel erledigt die Anrechnung ausländischer
Quellensteuer gleich mit — einschließlich des Effekts, dass sie auch den
Solidaritätszuschlag mindert.

### Was abgedeckt ist

- Einkommensteuertarif 2026 (§ 32a EStG), Vorsorgepauschale, Arbeitnehmer- und
  Sonderausgaben-Pauschbetrag, Entlastungsbetrag für Alleinerziehende,
  Altersentlastungsbetrag
- Steuerklassen I–VI samt Sondertarif für V und VI, Steuerklasse IV mit Faktor
- Solidaritätszuschlag mit Freigrenze und Milderungszone
- Kirchensteuer: 8 % in Bayern und Baden-Württemberg, sonst 9 %
- Kranken-, Pflege-, Renten- und Arbeitslosenversicherung mit den
  Bemessungsgrenzen 2026; Pflegezuschlag für Kinderlose, Abschläge ab dem
  zweiten Kind, Sachsen-Regel
- Minijob (bis 603 €) und Übergangsbereich bis 2 000 € nach § 20 Abs. 2a SGB IV
- Private Kranken- und Pflegeversicherung mit gedeckeltem Arbeitgeberzuschuss
- Freibetrag und Hinzurechnungsbetrag aus dem Lohnsteuer-Ermäßigungsverfahren

### Was bewusst fehlt

Einmalzahlungen und sonstige Bezüge, Versorgungsbezüge, geldwerte Vorteile,
vermögenswirksame Leistungen, betriebliche Altersversorgung, die Kappung der
Kirchensteuer in einigen Ländern, Umlagen U1/U2 und die Unfallversicherung.

> Ergebnis ohne Gewähr und keine steuerliche Beratung. Verbindlich ist die
> Abrechnung Ihres Arbeitgebers.

---

## Privacy first — und nachgeprüft

Die Behauptung „läuft nur lokal“ ist leicht aufgestellt. Hier ist sie gemessen:
Beim vollständigen Durchspielen aller vier Rechner stellt die Seite **vier
Netzwerkanfragen** — HTML, JavaScript, CSS, Symbol. Alle an den eigenen Host,
alle `GET`. Danach keine einzige mehr.

- **Keine fremden Hosts.** Keine Schriftarten, keine Skripte, keine Analyse,
  keine eingebetteten Inhalte Dritter — deshalb auch kein Einwilligungsbanner.
- **Funktioniert offline.** Ein Service Worker legt die Anwendung schon beim
  ersten Besuch vollständig ab. Netzwerk trennen, neu laden, weiterrechnen.
- **Speichern nur auf Wunsch.** Eingaben landen ausschließlich dann im
  `localStorage`, wenn Sie es ausdrücklich einschalten. Abschalten löscht sofort.
- **Teilen ohne Upload.** Der Szenario-Link trägt die Werte im Fragment (`#`)
  der Adresse — dieser Teil wird von Browsern nie an einen Server gesendet.
- **CSV und Druck** werden im Browser erzeugt.

---

## Entwicklung

Voraussetzung: [Bun](https://bun.sh) (oder Node 20+ mit npm).

```bash
bun install
bun run dev        # Entwicklungsserver
bun run test       # 360 Tests, darunter die 207 amtlichen Vektoren
bun run typecheck  # TypeScript im strict-Modus
bun run build      # statische Dateien nach dist/
```

Das Ergebnis in `dist/` ist rein statisch und läuft auf jedem Webspace,
GitHub Pages eingeschlossen — `base` ist relativ gesetzt, ein Unterverzeichnis
ist also kein Problem.

### Jahreswechsel

```bash
bun run gen:lohnsteuer        # holt den PAP und meldet Änderungen
bun run gen:lohnsteuer 2027   # für ein neues Jahr
```

Das Skript lädt die amtliche XML, vergleicht sie mit `vendor/` und nennt die
Befehle zum Neuerzeugen des Rechenkerns. Die Sozialversicherungswerte stehen
gesammelt und kommentiert in [`src/lib/constants.ts`](src/lib/constants.ts).

### Aufbau

```
src/lib/
  bigdecimal.ts               exakte Dezimalarithmetik (BigInt, ohne Abhängigkeiten)
  lohnsteuer2026.generated.js amtlicher Rechenkern — erzeugt, nicht bearbeiten
  constants.ts                Rechengrößen 2026, Bundesländer, Steuerklassen
  sozialversicherung.ts       Beiträge, Bemessungsgrenzen, Minijob, Übergangsbereich
  payroll.ts                  führt Steuer und Beiträge zur Abrechnung zusammen
  teilzeit.ts                 Stundenreduktion, Grenzbelastung, Entgeltpunkte
  budget.ts                   Haushaltsmodell: Einnahmen, Ausgaben, Unterposten
  sankey.ts                   Layout des Geldflussdiagramms (reine Funktion)
  dividende.ts                Abgeltungsteuer, Teilfreistellung, Rückrechnung aufs Depot
  format.ts                   deutsche Zahlenformate und ihre Rückumwandlung
src/components/               Oberfläche (React, handgeschriebenes CSS)
```

### Farbgebung des Geldflussdiagramms

Farbe kodiert dort die **Rolle** — Einnahme, Ausgabe, Überschuss —, nicht die
einzelne Kategorie. Das ist bewusst: Ein Überschussknoten kann neben jeder
beliebigen Ausgabenkategorie zu liegen kommen, und für diese Nachbarschaft lässt
sich keine Palette pro Kategorie absichern, die auch bei Farbfehlsichtigkeit
unterscheidbar bleibt. Die drei Rollenfarben sind über alle Paare hinweg geprüft;
jeder Posten trägt seinen Namen und Betrag direkt am Knoten, Unterposten eine
hellere Stufe ihres Elternteils.

Laufzeit-Abhängigkeiten: React und React-DOM. Sonst nichts — der Rechenkern
soll vollständig lesbar und nachprüfbar bleiben.

## Lizenz

MIT. Der amtliche Programmablaufplan stammt vom Bundesministerium der Finanzen;
die Testvektoren aus [canida-software/lohnsteuer](https://github.com/canida-software/lohnsteuer) (MIT).
