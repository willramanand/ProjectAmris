---
phase: quick-260831-rnn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/ci.yml
autonomous: true
requirements: [CI-BROWSER-01]
estimate:
  tokens: 8000
  raw_tokens: 6000
  tasks: 1
  confidence: high
must_haves:
  truths:
    - "The CI `browser` job installs WebKit and Firefox WITH their OS libraries, so all three engines launch on ubuntu-latest."
    - "The CI `perf` job is unchanged and still installs Chromium only."
  artifacts:
    - ".github/workflows/ci.yml (browser job install step updated to --with-deps)"
  key_links:
    - "browser job `Install Chromium + WebKit + Firefox` step -> `npx playwright install --with-deps ...` -> playwright install-deps (apt) provisions OS libs -> browserType.launch() succeeds for webkit/firefox"
---

<objective>
Fix the CI `browser` job failure `browserType.launch: Host system is missing dependencies to run browsers` by installing Playwright's OS-level system dependencies alongside the browser binaries.

Purpose: The `browser` lane (real ElementInternals + in-browser axe) is a correctness gate. On the current ubuntu-latest runner image, WebKit and Firefox cannot launch because their shared OS libraries are absent — the binaries alone are not enough. The `perf` job (Chromium only) passes, isolating the gap to the webkit/firefox system deps.
Output: A one-line change in `.github/workflows/ci.yml` swapping `npx playwright install ...` for `npx playwright install --with-deps ...` in the `browser` job only.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.github/workflows/ci.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add --with-deps to the browser job Playwright install</name>
  <files>.github/workflows/ci.yml</files>
  <action>In the `browser` job's `Install Chromium + WebKit + Firefox` step (the `run:` line, currently line 48), change `npx playwright install chromium webkit firefox` to `npx playwright install --with-deps chromium webkit firefox`. The `--with-deps` flag runs `playwright install-deps` (apt), provisioning the OS libraries WebKit and Firefox need to launch on ubuntu-latest — the standard GitHub Actions fix. Change ONLY this one line. Do NOT modify the `perf` job's `npx playwright install chromium` step (it passes and is Chromium-only by design). Do NOT touch the step name, any other job, or any other file. Keep the diff to a single changed line.</action>
  <verify>
    <automated>bash -c "cd 'C:/repos/ProjectAmris' && test \"$(grep -c -- '--with-deps chromium webkit firefox' .github/workflows/ci.yml)\" = 1 && test \"$(grep -c 'playwright install chromium webkit firefox' .github/workflows/ci.yml)\" = 0 && test \"$(grep -c 'npx playwright install chromium$' .github/workflows/ci.yml)\" = 1 && test \"$(git diff --numstat .github/workflows/ci.yml | awk '{print \$1\" \"\$2}')\" = '1 1'"</automated>
    <human-check>Push the branch, re-run the CI `browser` job on the PR, and confirm the `Browser lane (real ElementInternals + in-browser axe)` step passes (no `Host system is missing dependencies` error) and the `perf` job still passes.</human-check>
  </verify>
  <done>The `browser` job install line reads `npx playwright install --with-deps chromium webkit firefox`; the old form without `--with-deps` is gone; the `perf` job's `npx playwright install chromium` line is unchanged; and `git diff` on `ci.yml` shows exactly one line added and one removed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| CI runner -> apt/OS packages | `--with-deps` invokes `playwright install-deps` which apt-installs OS libraries on the ephemeral ubuntu-latest runner. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | `playwright install --with-deps` OS-dep install on runner | low | accept | Uses Playwright's own pinned, official `install-deps` recipe on an ephemeral read-only-permission runner (`contents: read`); no new npm/package dependencies are added and no publish credential is present in this job. |
</threat_model>

<verification>
- `grep` confirms exactly one `--with-deps chromium webkit firefox` install line in the `browser` job.
- `grep` confirms zero occurrences of the pre-fix form `playwright install chromium webkit firefox` (without `--with-deps`).
- `grep` confirms the `perf` job's `npx playwright install chromium` line is intact (one match ending in `chromium`).
- `git diff --numstat` on `ci.yml` reports exactly `1 1` (one line changed).
- Real proof (human-check): CI `browser` job re-run passes with all three engines launching; `perf` job still passes.
</verification>

<success_criteria>
- The `browser` job installs Chromium, WebKit, and Firefox with their OS dependencies and all three launch on ubuntu-latest.
- No other job or file is modified; the change is a single line.
</success_criteria>

<output>
Create `.planning/quick/260831-rnn-fix-ci-browser-job-playwright-host-deps-/260831-rnn-SUMMARY.md` when done.
</output>
