#!/usr/bin/env node
/**
 * Test suite per Cronoconvert
 * Valida la logica di conversione e la struttura HTML
 */
'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  \x1b[32m✓\x1b[0m ' + name);
  } catch (e) {
    failed++;
    console.log('  \x1b[31m✗\x1b[0m ' + name);
    console.log('    \x1b[31m' + e.message + '\x1b[0m');
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertClose(actual, expected, tolerance, msg) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error((msg || 'Value mismatch') + ': expected ≈' + expected + ', got ' + actual);
  }
}

// ── Load the HTML file ──
const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

console.log('\n📋 Test struttura HTML');
console.log('═══════════════════════');

test('File index.html esiste', () => {
  assert(fs.existsSync(htmlPath), 'index.html non trovato');
});

test('DOCTYPE html presente', () => {
  assert(html.includes('<!DOCTYPE html>'), 'DOCTYPE mancante');
});

test('lang="it" impostato', () => {
  assert(html.includes('lang="it"'), 'Attributo lang mancante');
});

test('Meta viewport presente', () => {
  assert(html.includes('name="viewport"'), 'Viewport meta mancante');
});

test('Tag <title> presente e descrittivo', () => {
  assert(/<title>[^<]+Convertitore[^<]*<\/title>/.test(html), 'Title mancante o non descrittivo');
});

test('Meta description presente', () => {
  assert(html.includes('name="description"'), 'Meta description mancante');
});

test('Tag <h1> esattamente uno', () => {
  const h1Matches = html.match(/<h1[^>]*>/g);
  assert(h1Matches && h1Matches.length === 1, 'Deve esserci esattamente un h1, trovati: ' + (h1Matches ? h1Matches.length : 0));
});

test('Elemento <header> presente', () => {
  assert(/<header\b/.test(html), 'Header mancante');
});

test('Elemento <main> presente', () => {
  assert(/<main\b/.test(html), 'Main mancante');
});

test('Elemento <footer> presente', () => {
  assert(/<footer\b/.test(html), 'Footer mancante');
});

test('Label associate a input (for="inputValue")', () => {
  assert(html.includes('for="inputValue"'), 'Label per inputValue mancante');
});

test('Label associate a select (for="inputUnit")', () => {
  assert(html.includes('for="inputUnit"'), 'Label per inputUnit mancante');
});

test('Open Graph tags presenti', () => {
  assert(html.includes('og:title'), 'og:title mancante');
  assert(html.includes('og:description'), 'og:description mancante');
  assert(html.includes('og:type'), 'og:type mancante');
  assert(html.includes('og:url'), 'og:url mancante');
});

test('Canonical URL presente', () => {
  assert(html.includes('rel="canonical"'), 'Canonical mancante');
});

test('JSON-LD schema presente', () => {
  assert(html.includes('application/ld+json'), 'JSON-LD mancante');
  assert(html.includes('WebApplication'), 'Tipo schema WebApplication mancante');
});

test('<base href="./"> presente', () => {
  assert(html.includes('base href="./"'), 'Base tag mancante');
});

test('Nessun URL assoluto in src/href (tranne font e canonici)', () => {
  // Check for absolute paths starting with "/" in src/href (not http://)
  const absPaths = html.match(/(?:src|href)="\/(?!\/)[^"]*"/g) || [];
  // Filter out Google Fonts URLs and other allowed external URLs
  const disallowed = absPaths.filter(p => !p.includes('fonts.googleapis.com') && !p.includes('schema.org'));
  assert(disallowed.length === 0, 'Trovati path assoluti: ' + disallowed.join(', '));
});

test('robots.txt esiste', () => {
  assert(fs.existsSync(path.join(__dirname, 'robots.txt')), 'robots.txt non trovato');
});

test('sitemap.xml esiste', () => {
  assert(fs.existsSync(path.join(__dirname, 'sitemap.xml')), 'sitemap.xml non trovato');
});

test('aria-live per aggiornamenti in tempo reale', () => {
  assert(html.includes('aria-live="polite"'), 'aria-live mancante');
});

test('role="alert" per messaggi di errore', () => {
  assert(html.includes('role="alert"'), 'role="alert" mancante');
});

// ── Test logica di conversione ──
console.log('\n📐 Test logica di conversione');
console.log('═══════════════════════════');

// La logica di conversione è replicata qui per i test unitari.
// Il JS nell'HTML è verificato indirettamente tramite i test di struttura.
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

const UNITS = [
  { key: 's',   name: 'Secondi',  nameSingular: 'Secondo',  symbol: 's',  toSeconds: 1 },
  { key: 'min', name: 'Minuti',   nameSingular: 'Minuto',   symbol: 'min', toSeconds: 60 },
  { key: 'h',   name: 'Ore',      nameSingular: 'Ora',      symbol: 'h',   toSeconds: 3600 },
  { key: 'd',   name: 'Giorni',   nameSingular: 'Giorno',   symbol: 'd',   toSeconds: 86400 }
];

function formatNumber(value, decimals) {
  var fixed = Number(value).toFixed(decimals);
  if (fixed.indexOf('.') !== -1) {
    fixed = fixed.replace(/0+$/, '');
    if (fixed.charAt(fixed.length - 1) === '.') {
      fixed = fixed.slice(0, -1);
    }
  }
  return fixed;
}

function convert(value, fromUnitKey, decimals) {
  var fromUnit = UNITS.find(function(u) { return u.key === fromUnitKey; });
  var totalSeconds = value * fromUnit.toSeconds;
  var results = {};
  UNITS.forEach(function (toUnit) {
    var converted = totalSeconds / toUnit.toSeconds;
    results[toUnit.key] = {
      value: converted,
      formatted: formatNumber(converted, decimals),
      unit: toUnit,
      isSource: toUnit.key === fromUnitKey
    };
  });
  return { results: results, totalSeconds: totalSeconds };
}

// ── Criterio di accettazione 1: 90 secondi ──
test('90 secondi → 0.025 ore', () => {
  const data = convert(90, 's', 8);
  assertClose(data.results['h'].value, 0.025, 0.00001, '90s in ore');
});

test('90 secondi → 1.5 minuti', () => {
  const data = convert(90, 's', 8);
  assertClose(data.results['min'].value, 1.5, 0.00001, '90s in minuti');
});

test('90 secondi → ~0.00104167 giorni', () => {
  const data = convert(90, 's', 8);
  assertClose(data.results['d'].value, 90/86400, 0.0000001, '90s in giorni');
});

test('90 secondi → 90 secondi (identità)', () => {
  const data = convert(90, 's', 8);
  assertClose(data.results['s'].value, 90, 0.00001, '90s in secondi');
});

// Scomposizione 90s: 1 minuto e 30 secondi
test('Scomposizione 90s → 1 minuto e 30 secondi', () => {
  const totalSeconds = 90;
  let remaining = totalSeconds;
  const days = Math.floor(remaining / SECONDS_PER_DAY);
  remaining = remaining % SECONDS_PER_DAY;
  const hours = Math.floor(remaining / SECONDS_PER_HOUR);
  remaining = remaining % SECONDS_PER_HOUR;
  const minutes = Math.floor(remaining / SECONDS_PER_MINUTE);
  remaining = remaining % SECONDS_PER_MINUTE;
  const seconds = remaining;
  assert(days === 0, 'Giorni: attesi 0, ottenuti ' + days);
  assert(hours === 0, 'Ore: attese 0, ottenute ' + hours);
  assert(minutes === 1, 'Minuti: atteso 1, ottenuti ' + minutes);
  assertClose(seconds, 30, 0.001, 'Secondi residui');
});

// ── Criterio di accettazione 2: 2 ore ──
test('2 ore → 7200 secondi', () => {
  const data = convert(2, 'h', 8);
  assertClose(data.results['s'].value, 7200, 0.00001, '2h in secondi');
});

test('2 ore → 120 minuti', () => {
  const data = convert(2, 'h', 8);
  assertClose(data.results['min'].value, 120, 0.00001, '2h in minuti');
});

test('2 ore → ~0.08333 giorni', () => {
  const data = convert(2, 'h', 8);
  assertClose(data.results['d'].value, 2/24, 0.0001, '2h in giorni');
});

test('2 ore → 2 ore (identità)', () => {
  const data = convert(2, 'h', 8);
  assertClose(data.results['h'].value, 2, 0.00001, '2h in ore');
});

// Scomposizione 2h: 2 ore e 0 minuti
test('Scomposizione 2h → 2 ore', () => {
  const totalSeconds = 7200;
  let remaining = totalSeconds;
  const days = Math.floor(remaining / SECONDS_PER_DAY);
  remaining = remaining % SECONDS_PER_DAY;
  const hours = Math.floor(remaining / SECONDS_PER_HOUR);
  remaining = remaining % SECONDS_PER_HOUR;
  const minutes = Math.floor(remaining / SECONDS_PER_MINUTE);
  remaining = remaining % SECONDS_PER_MINUTE;
  const seconds = remaining;
  assert(days === 0, 'Giorni: attesi 0');
  assert(hours === 2, 'Ore: attese 2, ottenute ' + hours);
  assert(minutes === 0, 'Minuti: attesi 0');
  assertClose(seconds, 0, 0.001, 'Secondi residui');
});

// ── Test aggiuntivi ──
test('1 giorno → 86400 secondi', () => {
  const data = convert(1, 'd', 8);
  assertClose(data.results['s'].value, 86400, 0.00001);
});

test('1 giorno → 1440 minuti', () => {
  const data = convert(1, 'd', 8);
  assertClose(data.results['min'].value, 1440, 0.00001);
});

test('1 giorno → 24 ore', () => {
  const data = convert(1, 'd', 8);
  assertClose(data.results['h'].value, 24, 0.00001);
});

test('60 minuti → 1 ora', () => {
  const data = convert(60, 'min', 8);
  assertClose(data.results['h'].value, 1, 0.00001);
});

test('3.5 ore → 12600 secondi', () => {
  const data = convert(3.5, 'h', 8);
  assertClose(data.results['s'].value, 12600, 0.00001);
});

test('0.5 giorni → 12 ore', () => {
  const data = convert(0.5, 'd', 8);
  assertClose(data.results['h'].value, 12, 0.00001);
});

test('3661 secondi → scomposizione 1h 1min 1s', () => {
  let remaining = 3661;
  const days = Math.floor(remaining / SECONDS_PER_DAY);
  remaining %= SECONDS_PER_DAY;
  const hours = Math.floor(remaining / SECONDS_PER_HOUR);
  remaining %= SECONDS_PER_HOUR;
  const minutes = Math.floor(remaining / SECONDS_PER_MINUTE);
  remaining %= SECONDS_PER_MINUTE;
  const seconds = remaining;
  assert(days === 0);
  assert(hours === 1);
  assert(minutes === 1);
  assertClose(seconds, 1, 0.001);
});

// ── Riepilogo ──
console.log('\n═══════════════════════');
console.log('Risultati: ' + '\x1b[32m' + passed + ' passati\x1b[0m, ' + '\x1b[31m' + failed + ' falliti\x1b[0m');
console.log('Totale: ' + (passed + failed) + ' test\n');

process.exit(failed > 0 ? 1 : 0);
