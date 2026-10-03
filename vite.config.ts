import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Trägt die tatsächlich gebauten Dateinamen in den Service Worker ein.
 *
 * Ohne das könnte der Worker die Anwendung erst beim zweiten Aufruf
 * zwischenspeichern — das Versprechen „funktioniert offline“ würde beim
 * ersten Besuch nicht halten.
 */
function serviceWorkerPrecache(): Plugin {
  return {
    name: 'finpal-sw-precache',
    apply: 'build',
    writeBundle(optionen, bundle) {
      const ausgabeVerzeichnis = optionen.dir ?? 'dist';
      const dateien = Object.keys(bundle)
        .filter((name) => name !== 'sw.js')
        .map((name) => `./${name}`);
      const zuCachen = ['./', ...dateien, './manifest.webmanifest', './icon.svg'];

      const kennung = createHash('sha256')
        .update(zuCachen.join('|'))
        .digest('hex')
        .slice(0, 12);

      const pfad = resolve(ausgabeVerzeichnis, 'sw.js');
      const inhalt = readFileSync(pfad, 'utf8')
        .replace(/^const CACHE = .*\/\* BUILD:CACHE \*\/$/m, `const CACHE = 'finpal-${kennung}';`)
        .replace(
          /^const PRECACHE = .*\/\* BUILD:PRECACHE \*\/$/m,
          `const PRECACHE = ${JSON.stringify([...new Set(zuCachen)])};`,
        );
      writeFileSync(pfad, inhalt);
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerPrecache()],
  // Relative Basis, damit das Build auch aus einem Unterverzeichnis heraus läuft.
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 4096,
  },
});
