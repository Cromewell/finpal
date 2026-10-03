#!/usr/bin/env node
/**
 * Holt den amtlichen Programmablaufplan (PAP) für die Lohnsteuer vom BMF und
 * vergleicht ihn mit der eingecheckten Fassung in vendor/.
 *
 * Aufruf:  node scripts/fetch-pap.mjs [jahr]
 *
 * Der Rechenkern src/lib/lohnsteuer2026.generated.js wird aus dieser XML mit
 * LstGen erzeugt. Sobald das BMF eine neue Fassung veröffentlicht (oder ein
 * neues Jahr beginnt), meldet dieses Skript den Unterschied und nennt die
 * Befehle zum Neuerzeugen.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JAHR = process.argv[2] ?? '2026';
const QUELLE = `https://www.bmf-steuerrechner.de/javax.faces.resource/daten/xmls/Lohnsteuer${JAHR}.xml.xhtml`;
const ZIEL = resolve(WURZEL, 'vendor', `Lohnsteuer${JAHR}.xml`);

const pruefsumme = (text) => createHash('sha256').update(text).digest('hex');

async function main() {
  console.log(`Lade amtlichen Programmablaufplan ${JAHR}`);
  console.log(`  ${QUELLE}`);

  const antwort = await fetch(QUELLE);
  if (!antwort.ok) {
    throw new Error(
      `Abruf fehlgeschlagen (HTTP ${antwort.status}). ` +
      `Für ${JAHR} gibt es womöglich noch keinen veröffentlichten Plan.`,
    );
  }
  const neu = await antwort.text();
  if (!neu.includes('<PAP')) {
    throw new Error('Die Antwort enthält keinen Programmablaufplan.');
  }

  const stand = /<!--\s*Stand:\s*([^>]*?)\s*-->/.exec(neu)?.[1] ?? 'unbekannt';
  console.log(`  Stand laut Datei: ${stand}`);

  let alt = null;
  try {
    alt = await readFile(ZIEL, 'utf8');
  } catch {
    console.log('  Noch keine eingecheckte Fassung vorhanden.');
  }

  if (alt !== null && pruefsumme(alt) === pruefsumme(neu)) {
    console.log('\nUnverändert — der erzeugte Rechenkern ist aktuell.');
    return;
  }

  await mkdir(dirname(ZIEL), { recursive: true });
  await writeFile(ZIEL, neu, 'utf8');
  console.log(`\nNeue Fassung gespeichert: vendor/Lohnsteuer${JAHR}.xml`);
  console.log('\nRechenkern neu erzeugen:');
  console.log('  pipx install lstgen   # oder: pip install lstgen');
  console.log(`  lstgen -l javascript -x vendor/Lohnsteuer${JAHR}.xml \\`);
  console.log(`         --class-name Lohnsteuer${JAHR} --outfile /tmp/gen.js`);
  console.log(`\nAnschließend in src/lib/lohnsteuer${JAHR}.generated.js übernehmen:`);
  console.log('  - Kopfkommentar mit Quelle und Stand beibehalten');
  console.log("  - statt require: import BigDecimal from './bigdecimal';");
  console.log('  - statt module.exports: export default Lohnsteuer' + JAHR + ';');
  console.log('\nDanach unbedingt die Testvektoren laufen lassen: bun run test');
  process.exitCode = 1; // Für CI: Änderung erkannt.
}

main().catch((fehler) => {
  console.error(`\nFehler: ${fehler.message}`);
  process.exitCode = 2;
});
