// Tarball smoke (SHIP-03, full resolution matrix). Zero-new-dependency ESM Node
// script using only node built-ins + the repo-resident esbuild. Proves the
// PACKED artifact RESOLVES — not runtime execution: importing a component module
// runs customElements.define(), which throws in bare Node, so this asserts the
// `exports` map resolves each documented entry to a real shipped file and that a
// real bundler can consume the package with Lit kept external (the actual risk
// for a freshly published package; the browser lane already proves runtime).
//
// Steps (each fails loud with a non-zero exit + a clear message):
//   1. `npm pack --json` at the repo root -> discover the tarball dynamically.
//   2. Create a throwaway ESM project under os.tmpdir() and install the tarball
//      + the Lit peer into it (no publish credential needed).
//   3. Raw ESM leg — in the installed throwaway project, assert
//      import.meta.resolve(...) returns an existing file: target for EACH of the
//      full entry, a per-component deep entry, and the token stylesheet.
//   4. Bundler leg — invoke esbuild's JS API (imported from the repo) to bundle
//      an entry importing the full package + the button deep entry, with
//      lit/@lit/@floating-ui kept external (proving Lit is not inlined); assert
//      the build succeeds and the produced bundle is non-empty.
//   5. Always remove the temp dir and the tarball on exit.
//
// Cross-platform: node built-ins + argument-array execFileSync only (no shell
// string interpolation, no bash-only syntax) so it runs on the Windows dev box
// and the CI ubuntu Node 20 runner alike.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const IS_WIN = process.platform === 'win32';
const PKG = '@willramanand/amris';

// The SHIP-03 resolution matrix: the full entry, a per-component deep entry, and
// the token stylesheet must each resolve from an installed tarball via `exports`.
const SUBPATHS = [PKG, `${PKG}/components/button`, `${PKG}/styles/tokens.css`];

// Peer/externals a consumer bundle must NOT inline — Lit stays a peer, and the
// bundler leg keeps @floating-ui external too. `@lit/*` catches @lit/context;
// this proves Lit is never inlined while the package's own deps still bundle.
const EXTERNAL = ['lit', '@lit/*', '@floating-ui/*'];

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..');

const fail = (msg) => {
  console.error(`\nsmoke-pack FAILED: ${msg}`);
  process.exit(1);
};

// Resolve an npm-cli.js we can run under the current node binary — the fully
// space-safe, shell-free path. Prefer npm_execpath (set by `npm run smoke`), then
// the npm bundled next to this node install (covers a direct `node ...` launch,
// including on Windows where `npm.cmd` cannot be execFile'd without a shell —
// EINVAL, post-CVE-2024-27980).
const bundledNpmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npmExecpath = process.env.npm_execpath;
const npmCli =
  npmExecpath && npmExecpath.endsWith('.js')
    ? npmExecpath
    : existsSync(bundledNpmCli)
      ? bundledNpmCli
      : null;

// Cross-platform npm invocation. Route through node+npm-cli.js when available
// (no shell, arg array is space-safe). Last resort: spawn the platform launcher —
// on Windows `npm.cmd` needs shell:true with double-quoted args; POSIX runs `npm`.
const run = (args, opts = {}) => {
  if (npmCli) {
    return execFileSync(process.execPath, [npmCli, ...args], { encoding: 'utf8', ...opts });
  }
  if (IS_WIN) {
    const quoted = args.map((a) => `"${a}"`);
    return execFileSync('npm.cmd', quoted, { encoding: 'utf8', shell: true, ...opts });
  }
  return execFileSync('npm', args, { encoding: 'utf8', ...opts });
};

let tempDir;
let tarballPath;

try {
  // (1) Pack the library and discover the produced tarball dynamically.
  let packJson;
  try {
    const out = run(['pack', '--json'], { cwd: repoRoot });
    const jsonStart = out.indexOf('[');
    if (jsonStart === -1) throw new Error(`no JSON in npm pack output:\n${out}`);
    packJson = JSON.parse(out.slice(jsonStart));
  } catch (err) {
    fail(`\`npm pack --json\` failed: ${err.message}`);
  }
  const entry = Array.isArray(packJson) ? packJson[0] : packJson;
  if (!entry || !entry.filename) fail('npm pack --json returned no filename');

  // Scoped names render on disk with '@' dropped and '/' -> '-'. Prefer the exact
  // reported name if it exists, else the sanitized on-disk form. Do not hardcode
  // the version (0.2.0 today, 1.0.0 after the release bump).
  const reported = entry.filename;
  const sanitized = reported.replace(/^@/, '').replace(/\//g, '-');
  const candidate = [reported, sanitized]
    .map((n) => join(repoRoot, n))
    .find((p) => existsSync(p));
  if (!candidate) fail(`packed tarball not found on disk (reported: ${reported})`);
  tarballPath = candidate;

  // (2) Throwaway ESM project under os.tmpdir(); install the tarball + Lit peer.
  tempDir = mkdtempSync(join(tmpdir(), 'amris-smoke-'));
  writeFileSync(
    join(tempDir, 'package.json'),
    JSON.stringify({ type: 'module', private: true }, null, 2),
  );
  try {
    run(['install', tarballPath, 'lit', '--no-audit', '--no-fund'], {
      cwd: tempDir,
      stdio: 'inherit',
    });
  } catch (err) {
    fail(`installing the tarball + lit into the throwaway project failed: ${err.message}`);
  }

  // (3) Raw ESM leg — prove EACH matrix entry resolves through the `exports`
  // map to a real file. Runs inside the installed throwaway project so the
  // resolution is exactly what a consumer sees. Fails loud naming the first
  // subpath that does not resolve.
  const checkPath = join(tempDir, 'resolve-check.mjs');
  writeFileSync(
    checkPath,
    [
      "import { existsSync } from 'node:fs';",
      "import { fileURLToPath } from 'node:url';",
      `const subpaths = ${JSON.stringify(SUBPATHS)};`,
      'for (const spec of subpaths) {',
      '  let url;',
      '  try {',
      '    url = import.meta.resolve(spec);',
      '  } catch (err) {',
      "    console.error('resolve-check FAILED: ' + spec + ' did not resolve via the exports map: ' + err.message);",
      '    process.exit(1);',
      '  }',
      '  const file = fileURLToPath(url);',
      '  if (!existsSync(file)) {',
      "    console.error('resolve-check FAILED: ' + spec + ' resolved to a missing file: ' + file);",
      '    process.exit(1);',
      '  }',
      "  console.log('resolved ' + spec + ' -> ' + file);",
      '}',
      '',
    ].join('\n'),
  );
  try {
    const resolveOut = execFileSync(process.execPath, ['resolve-check.mjs'], {
      cwd: tempDir,
      encoding: 'utf8',
    });
    process.stdout.write(resolveOut);
  } catch (err) {
    fail(`raw-ESM resolution matrix failed in the throwaway project: ${err.message}`);
  }

  // (4) Bundler leg — a real bundler (esbuild, imported from the repo's
  // node_modules) must consume the installed package with lit/@floating-ui kept
  // external (proving Lit is never inlined) and produce a non-empty bundle.
  const entryFile = join(tempDir, 'entry.mjs');
  writeFileSync(
    entryFile,
    [`import '${PKG}';`, `import '${PKG}/components/button';`, ''].join('\n'),
  );

  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch (err) {
    fail(
      `esbuild is required for the bundler leg but could not be imported from the repo: ${err.message}`,
    );
  }

  try {
    const result = await esbuild.build({
      entryPoints: [entryFile],
      bundle: true,
      format: 'esm',
      // Resolve `@willramanand/amris` from the installed tarball in the temp
      // project, not the repo source.
      absWorkingDir: tempDir,
      external: EXTERNAL,
      write: false,
      logLevel: 'silent',
    });
    const outputs = result.outputFiles ?? [];
    const totalBytes = outputs.reduce((sum, f) => sum + f.contents.length, 0);
    if (totalBytes === 0) {
      fail('esbuild produced an empty bundle from the installed package');
    }
    console.log(
      `bundled ${PKG} + button deep entry via esbuild (lit/@floating-ui external) -> ${totalBytes} bytes`,
    );
  } catch (err) {
    fail(`esbuild failed to bundle the installed package: ${err.message}`);
  }

  console.log(
    `\nsmoke-pack OK: verified packed tarball ${entry.filename} across the full resolution matrix (raw ESM + esbuild bundler)`,
  );
} finally {
  // (5) Always clean up the temp dir and the tarball.
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  if (tarballPath) rmSync(tarballPath, { force: true });
}
