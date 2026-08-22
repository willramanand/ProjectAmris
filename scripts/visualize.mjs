// Dev-only bundle-attribution report (MEAS-05). Cross-platform wrapper that sets
// the VISUALIZE env gate (read by vite.config.ts) and runs the build, so
// `npm run visualize` works on POSIX and Windows alike without a cross-env dep.
// Local dev convenience only — CI attribution runs via the Node-22 size job's
// `size:why` step, never this script.
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VISUALIZE: '1' },
});

process.exit(result.status ?? 1);
