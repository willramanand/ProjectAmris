import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';
import minifyHTML from '@lit-labs/rollup-plugin-minify-html-literals';

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

function createLibraryBuild(entry: string, fileName: string, emptyOutDir: boolean) {
  return {
    plugins: [stripLitCssComments()],
    build: {
      outDir: 'dist',
      emptyOutDir,
      minify: 'terser' as const,
      lib: {
        entry: resolve(__dirname, entry),
        formats: ['es' as const],
        fileName,
      },
      rollupOptions: {
        plugins: [minifyHTML()],
      },
    },
  };
}

export default defineConfig(({ mode }) =>
  mode === 'all'
    ? createLibraryBuild('src/index.all.ts', 'amris', false)
    : createLibraryBuild('src/index.ts', 'amris-core', true),
);
