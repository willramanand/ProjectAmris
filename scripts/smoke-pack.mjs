// Minimal tarball smoke (SHIP-03, thin slice). Zero-dependency ESM Node script
// using only node built-ins. Proves the PACKED artifact RESOLVES — not runtime
// execution: importing a component module runs customElements.define(), which
// throws in bare Node, so this asserts the `exports` map resolves the primary
// entry to a real shipped file (the actual risk for a freshly published
// package; the browser lane already proves runtime behavior).
//
// Steps (each fails loud with a non-zero exit + a clear message):
//   1. `npm pack --json` at the repo root -> discover the tarball dynamically.
//   2. Create a throwaway ESM project under os.tmpdir() and install the tarball
//      + the Lit peer into it (no publish credential needed).
//   3. In the throwaway project, assert import.meta.resolve('@willramanand/amris')
//      resolves through the `exports` map to an existing file.
//   4. Always remove the temp dir and the tarball on exit.
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

  // (3) Prove the primary entry resolves through the `exports` map to a real file.
  const checkPath = join(tempDir, 'resolve-check.mjs');
  writeFileSync(
    checkPath,
    [
      "import { existsSync } from 'node:fs';",
      "import { fileURLToPath } from 'node:url';",
      `const url = import.meta.resolve('${PKG}');`,
      'const file = fileURLToPath(url);',
      'if (!existsSync(file)) {',
      `  console.error('resolve-check FAILED: ${PKG} resolved to a missing file: ' + file);`,
      '  process.exit(1);',
      '}',
      `console.log('resolved ${PKG} -> ' + file);`,
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
    fail(`resolving ${PKG} in the throwaway project failed: ${err.message}`);
  }

  console.log(`\nsmoke-pack OK: verified packed tarball ${entry.filename}`);
} finally {
  // (4) Always clean up the temp dir and the tarball.
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  if (tarballPath) rmSync(tarballPath, { force: true });
}
