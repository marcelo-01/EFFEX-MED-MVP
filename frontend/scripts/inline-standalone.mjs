// Junta o build standalone (dist-standalone/) num único arquivo HTML, com CSS e JS embutidos,
// pronto para ser publicado como página estática (ex.: Claude Artifacts).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist-standalone');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const asset = (pattern) => {
  const match = html.match(pattern);
  if (!match) throw new Error(`Asset não encontrado: ${pattern}`);
  return readFileSync(join(dist, match[1].replace(/^\.\//, '')), 'utf8');
};

const css = asset(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"/);
// Evita que o conteúdo do bundle feche a tag <script> antes da hora.
const js = asset(/<script type="module"[^>]*src="([^"]+\.js)"/)
  .replaceAll('</script', '<\\/script')
  .replaceAll('<!--', '<\\!--');
const fonts = [...html.matchAll(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*>/g)].map((m) => m[0]).join('\n');

const page = `<title>Effex Med</title>
${fonts}
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js}
</script>
`;

const output = join(dist, 'effex-med.html');
writeFileSync(output, page);
console.log(`Página única gerada: ${output} (${(page.length / 1024).toFixed(0)} KB)`);
