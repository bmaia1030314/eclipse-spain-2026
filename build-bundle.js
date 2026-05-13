// build-bundle.js — combina styles.css, data.js e app.js no index.html
// e gera um ficheiro único self-contained: eclipse-leon-2026.html
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css  = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const data = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
const app  = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

const banner = `<!--
  Eclipse Solar Total — León 2026
  Single-file build. Tudo (HTML + CSS + dados + lógica) está aqui.
  Apenas Leaflet é carregado via CDN — se falhar, o resto continua a funcionar.
  Gerado em: ${new Date().toISOString()}
-->`;

// IMPORTANT: String.replace treats `$$`, `$&`, `$n` as special replacement
// patterns. Our JS source contains `$$` (querySelectorAll helper) which would
// be corrupted to `$`. Use a function-form replacement to pass the strings
// through verbatim.
const lit = (s) => () => s;

let merged = html
  .replace(
    '<link rel="stylesheet" href="styles.css" />',
    lit(`<style>\n${css}\n  </style>`)
  )
  .replace(
    /<script src="data\.js"><\/script>\s*<script src="app\.js"><\/script>/,
    lit(`<script>\n${data}\n  </script>\n  <script>\n${app}\n  </script>`)
  )
  .replace('<!DOCTYPE html>', lit(`<!DOCTYPE html>\n${banner}`));

// Extra integrity guard: a literal "$$" must survive in the bundle.
if (!merged.includes('const $$ =')) {
  console.error('FAILED: `const $$ =` was corrupted during bundling.');
  process.exit(1);
}

// Sanity: no leftover local references
const leftover = merged.match(/href="styles\.css"|src="data\.js"|src="app\.js"/);
if (leftover) {
  console.error('FAILED: leftover local reference:', leftover[0]);
  process.exit(1);
}

const out = path.join(ROOT, 'eclipse-leon-2026.html');
fs.writeFileSync(out, merged);
console.log('Wrote', out);
console.log('Size:', Math.round(merged.length / 1024 * 10) / 10, 'KB',
            '(' + merged.length + ' chars)');
