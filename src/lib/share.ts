/**
 * Szenarien als Link teilen. Die Werte stecken im Fragment („#“) der Adresse —
 * dieser Teil wird von Browsern grundsätzlich nicht an Server übertragen.
 * Es findet kein Upload statt; der Link ist nur so privat wie sein Empfänger.
 */

function zuBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binaer = '';
  bytes.forEach((b) => { binaer += String.fromCharCode(b); });
  return btoa(binaer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ausBase64Url(text: string): string {
  const basis = text.replace(/-/g, '+').replace(/_/g, '/');
  const binaer = atob(basis.padEnd(Math.ceil(basis.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binaer, (zeichen) => zeichen.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function kodiereZustand(zustand: unknown): string {
  return zuBase64Url(JSON.stringify(zustand));
}

export function dekodiereZustand<T>(fragment: string): Partial<T> | null {
  try {
    const roh = fragment.startsWith('#') ? fragment.slice(1) : fragment;
    if (!roh.startsWith('s=')) return null;
    return JSON.parse(ausBase64Url(roh.slice(2))) as Partial<T>;
  } catch {
    return null;
  }
}

export function teileLink(zustand: unknown): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#s=${kodiereZustand(zustand)}`;
}

/** Legt eine Datei im Browser zum Download ab — ohne Server. */
export function ladeDateiHerunter(dateiname: string, inhalt: string, typ: string): void {
  const blob = new Blob([`﻿${inhalt}`], { type: `${typ};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anker = document.createElement('a');
  anker.href = url;
  anker.download = dateiname;
  anker.click();
  URL.revokeObjectURL(url);
}
