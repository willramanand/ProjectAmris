import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import { readdirSync, statSync } from 'fs';
import minifyHTML from '@lit-labs/rollup-plugin-minify-html-literals';
import { visualizer } from 'rollup-plugin-visualizer';

// Dev-only bundle-attribution report (MEAS-05, CONTEXT D-09). Gated behind the
// `VISUALIZE` env flag so a normal `npm run build` emits no report and the
// shipped artifact is byte-unchanged. When set (`VISUALIZE=1 npm run build`),
// rollup-plugin-visualizer writes a machine-readable `bundle-stats.json`
// (`raw-data` template) to the repo root — OUTSIDE `dist/` so it can never enter
// the published tarball (`files: ["dist","README.md"]`). `scripts/attribution-check.mjs`
// reads this JSON to confirm highlight.js ships in no chunk.
function visualizerPlugins(): Plugin[] {
  if (!process.env.VISUALIZE) return [];
  return [
    visualizer({
      filename: 'bundle-stats.json',
      template: 'raw-data',
      gzipSize: true,
      brotliSize: true,
      emitFile: false,
    }) as unknown as Plugin,
  ];
}

function stripBlockComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, '');
}

function skipQuotedString(code: string, start: number): number {
  const quote = code[start];
  let index = start + 1;

  while (index < code.length) {
    const char = code[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === quote) return index + 1;
    index += 1;
  }

  return index;
}

function skipTemplateLiteral(code: string, start: number): number {
  let index = start + 1;

  while (index < code.length) {
    const char = code[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '`') return index + 1;
    if (char === '$' && code[index + 1] === '{') {
      index = skipInterpolation(code, index + 2);
      continue;
    }
    index += 1;
  }

  return index;
}

function skipInterpolation(code: string, start: number): number {
  let depth = 1;
  let index = start;

  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];

    if (char === '\'' || char === '"') {
      index = skipQuotedString(code, index);
      continue;
    }
    if (char === '`') {
      index = skipTemplateLiteral(code, index);
      continue;
    }
    if (char === '/' && next === '*') {
      const close = code.indexOf('*/', index + 2);
      index = close === -1 ? code.length : close + 2;
      continue;
    }
    if (char === '/' && next === '/') {
      const close = code.indexOf('\n', index + 2);
      index = close === -1 ? code.length : close + 1;
      continue;
    }
    if (char === '{') {
      depth += 1;
      index += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      index += 1;
      if (depth === 0) return index;
      continue;
    }
    index += 1;
  }

  return index;
}

function stripCommentsFromCssTemplate(content: string): string {
  let result = '';
  let segmentStart = 0;
  let index = 0;

  while (index < content.length) {
    const char = content[index];

    if (char === '\\') {
      index += 2;
      continue;
    }

    if (char === '$' && content[index + 1] === '{') {
      result += stripBlockComments(content.slice(segmentStart, index));
      const interpolationEnd = skipInterpolation(content, index + 2);
      result += content.slice(index, interpolationEnd);
      index = interpolationEnd;
      segmentStart = index;
      continue;
    }

    index += 1;
  }

  result += stripBlockComments(content.slice(segmentStart));
  return result;
}

function stripLitCssComments(): Plugin {
  return {
    name: 'strip-lit-css-comments',
    enforce: 'pre',
    transform(code, id) {
      const isSourceFile = id.includes('\\src\\') || id.includes('/src/');
      if (!isSourceFile || !code.includes('css`') || !code.includes('/*')) {
        return null;
      }

      const tag = 'css`';
      let result = '';
      let cursor = 0;
      let searchIndex = 0;
      let changed = false;

      while (searchIndex < code.length) {
        const tagIndex = code.indexOf(tag, searchIndex);
        if (tagIndex === -1) break;

        const templateStart = tagIndex + tag.length;
        const templateEnd = skipTemplateLiteral(code, templateStart - 1) - 1;
        if (templateEnd < templateStart) break;

        const original = code.slice(templateStart, templateEnd);
        const stripped = stripCommentsFromCssTemplate(original);

        result += code.slice(cursor, templateStart);
        result += stripped;
        cursor = templateEnd;
        searchIndex = templateEnd + 1;
        changed ||= original !== stripped;
      }

      if (!changed) return null;

      result += code.slice(cursor);
      return { code: result, map: null };
    },
  };
}

function discoverComponentEntries(): Record<string, string> {
  const dir = resolve(__dirname, 'src/components');
  const entries: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (!statSync(full).isDirectory()) continue;
    const entry = resolve(full, 'index.ts');
    try {
      if (statSync(entry).isFile()) {
        entries[`components/${name}/index`] = entry;
      }
    } catch {
      // skip components without barrel entry file
    }
  }
  return entries;
}

// Emit a JS entry for every `*.ts` file directly inside `src/<subdir>` so the
// package's deep `exports` subpaths (`./styles/*`, `./utilities/*`) actually
// resolve to shipped files. Without these entries only the bundled component
// chunks are emitted and a consumer importing e.g. `@willramanand/amris/styles/reset.css`
// or `@willramanand/amris/utilities/form-actions` would hit ERR_MODULE_NOT_FOUND.
// The entry key preserves the file's base name (minus `.ts`), so `reset.css.ts`
// -> `dist/styles/reset.css.js`, matching the `./styles/*` -> `./dist/styles/*.js` map.
function discoverFlatEntries(subdir: string): Record<string, string> {
  const dir = resolve(__dirname, 'src', subdir);
  const entries: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.ts')) continue;
    const full = resolve(dir, name);
    if (!statSync(full).isFile()) continue;
    const base = name.slice(0, -'.ts'.length);
    entries[`${subdir}/${base}`] = full;
  }
  return entries;
}

export default defineConfig(() => ({
  plugins: [stripLitCssComments(), ...visualizerPlugins()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser' as const,
    sourcemap: true,
    lib: {
      entry: {
        amris: resolve(__dirname, 'src/index.all.ts'),
        'amris-core': resolve(__dirname, 'src/index.ts'),
        // Opt-in COMPAT-03 side-effect subpath (`@willramanand/amris/compat-forms`);
        // a standalone top-level entry like `src/index.ts`, NOT a discovered
        // component/flat entry — see the `./compat-forms` key in package.json exports.
        'compat-forms': resolve(__dirname, 'src/compat-forms.ts'),
        // Deep public entries so `./tokens`, `./utilities/*`, `./styles/*` resolve
        // to real shipped JS (not just `.d.ts`) — see the `exports` map in package.json.
        'tokens/index': resolve(__dirname, 'src/tokens/index.ts'),
        ...discoverFlatEntries('utilities'),
        ...discoverFlatEntries('styles'),
        ...discoverComponentEntries(),
      },
      formats: ['es' as const],
    },
    rollupOptions: {
      external: ['lit', /^lit\//, /^@lit\//, /^@lit-labs\//, '@floating-ui/dom', /^@floating-ui\//],
      plugins: [minifyHTML()],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
}));

