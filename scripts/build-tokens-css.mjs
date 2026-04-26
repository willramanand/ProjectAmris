// Emits dist/styles/tokens.css — global stylesheet alternative to <am-theme-provider>.
// Reuses the same source-of-truth token modules from src/tokens.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const sources = [
  'src/tokens/primitives.css.ts',
  'src/tokens/semantic.css.ts',
  'src/tokens/dark.css.ts',
];

function extractCss(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const match = src.match(/css`([\s\S]*?)`/);
  if (!match) throw new Error(`no css\`...\` template in ${filePath}`);
  return match[1];
}

const blocks = sources.map((rel) => extractCss(resolve(root, rel)));

let combined = blocks.join('\n\n');

// Promote :host → :root, :host([theme='dark']) → @media / [data-theme='dark'].
combined = combined
  .replace(/:host\(\[theme=['"]dark['"]\]\)/g, ':root[data-theme="dark"]')
  .replace(/:host\(:not\(\[theme=['"]light['"]\]\)\)/g, ':root:not([data-theme="light"])')
  .replace(/:host/g, ':root');

const outDir = resolve(root, 'dist/styles');
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'tokens.css'), combined);
console.log('wrote dist/styles/tokens.css');
