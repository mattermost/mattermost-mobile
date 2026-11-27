# Test System IO for the new E2E pipelines

Draft for review. Not for commit.

Detox iOS, Detox iPad, and Detox Android only. Maestro stays on the current template.

## What stays

`e2e-ios-template.yml` and `e2e-android-template.yml` are not edited. Matterwick (`e2e-detox-pr.yml`) keeps calling them, including their existing `test-system-io-report-upload` step.

The new files are:

- `.github/workflows/e2e-ios-template-v2.yml`
- `.github/workflows/e2e-android-template-v2.yml`
- `.github/scripts/tsio-detox-specs.js` — which specs each run may see

`e2e-test-ci.yml` points `detox-ios` and `detox-ipad` at the iOS v2 workflow, and `detox-android` at the Android v2 workflow. Maestro jobs stay on `e2e-maestro-template.yml`.

v2 is the e2e-test-stack path those three jobs already use (build artifact, batch, provision, simulator or emulator, Detox). It does not carry the Matterwick-only pieces: Zephyr, spec-duration S3, channel messages, or `test-system-io-report-upload`.

## What Test System IO already does

The actions live in `mattermost/mattermost-test-system-io`. Pin the same commit the server repo pins for begin, run, and summary:

`c31c00f723b0b1c3e1d6b45a50b938d5afae729f` (2026-11-09, `#132`)

That commit already dispatches Detox. The older pin on the current mobile templates (`3212731`, report-upload only) is not the one to use here.

`mattermost/mattermost` `.github/workflows/e2e-tests-playwright-template.yml` is the shape to follow:

1. **dispatch-begin** walks the specs, `POST /api/v1/orchestration/begin`, and `POST /api/v1/reports/begin`. `total-reports-expected` is the worker count and is frozen for that run. An empty discovery throws, so a run with no specs is not begun.
2. **dispatch-run** on each worker leases specs, runs them, and uploads that worker's report. For Detox it runs `npx detox test <leased specs> -c <detox-config>` from `detox/`. It does not boot the simulator or the emulator. Those must already be up, on the config it is given (`ios.sim.debug`, `ios.ipad.debug`, `android.emu.debug`).
3. **summary** reads the run and fails the job when a unit failed or the run did not complete. The report group itself finalizes when `total-reports-expected` reports have arrived.

Authentication is the workflow OIDC token. Jobs that call these actions need `id-token: write`.

Playwright turns Test System IO's own commit statuses off (`post-pending-commit-status: false`, `update-commit-status: false`) and publishes its check elsewhere. v2 does the same. `e2e-test-ci.yml` setup and results keep posting `e2e-test-stack/<lane>`. Those contexts are not required checks, and v2 does not post `e2e-test/*`. The final status links to a Test System IO report when begin produced one. A failing run's report is preferred over the pool report.

Mobile's existing uploads go to production. v2 does too, unless `E2E_USE_STAGING_TEST_IO_URL` is `true`. The server repo's "staging unless the variable is false" default is not this repo's.

## Spec discovery

No Detox spec in this tree has a `// Tags:` line. An include of `@ipad_only` would begin an empty run, and an exclude of `@ipad_only` or `@ios_only` would change nothing. v2 keeps the split `generate-specs` already uses:

| Lane | Workflow | Pool `name` | `detox-config` | Specs |
|---|---|---|---|---|
| detox-ios | `e2e-ios-template-v2.yml` | `detox-ios` | `ios.sim.debug` | `detox/e2e/test`, skip the `ipad` directory |
| detox-ipad | `e2e-ios-template-v2.yml` | `detox-ipad` | `ios.ipad.debug` | `detox/e2e/test/products/channels/ipad` |
| detox-android | `e2e-android-template-v2.yml` | `detox-android` | `android.emu.debug` | `detox/e2e/test`, skip the `ipad` directory |

iOS-only behavior inside a shared file stays in the spec (`isIos()` / `isAndroid()`), as it does today. Tag filters are a later change, once the files actually carry the tags and a test checks them against the directories above.

`dispatch-begin` still has no exclude-list. The begin checkout is only the spec list, and the workers check out a clean tree. Before begin, the job deletes every `*.e2e.ts` under the search path that is not in that run, so the walk submits the right paths and the leased paths are the real files.

## One run per queue

`detox-ios`, `detox-ipad`, and `detox-android` share `github.run_id`. The composite identity's `name` has to differ or the runs overwrite each other.

A mutation spec changes server-wide state. `detox/e2e/server_mutation_specs.json` pins it to a server no pool shard uses (`B`, or `site3` on iOS). `site3` is also every pool shard's read-only `SITE_3`. One queue would lease a mutation spec onto a pool worker, and one mutation queue would lease a `B` spec onto the `site3` worker. Each target is its own run:

| Run name | Specs | Server |
|---|---|---|
| `<lane>` | the lane's specs, minus the manifest | one server per pool worker, plus shared SITE_2 and SITE_3 |
| `<lane>-mutation-b` | manifest entries for this platform whose target is B | that worker's own server |
| `<lane>-mutation-site3` | manifest entries whose iOS target is site3 | the shared SITE_3 |

Android has no site3 run. Those entries use `target` and run on B, which is what `generate-specs` does for Android today. iPad's search path contains none of the manifest, so both mutation runs are skipped and no empty begin is posted.

Identity fields, same as the server template: `repository`, `commit_sha` (the commit under test), `gh_run_id`, `gh_run_attempt`, `name`, `branch`, and `gh_pr_number` when the run has a pull request. `commit_sha` is the fork or pull-request SHA, not the workflow ref. `branch` is the pull request's head ref when `pr_number` is set, otherwise the ref this workflow runs from.

`total-reports-expected` equals that run's worker count. The pool starts at today's parallelism: 32 for iOS phone and Android, 1 for iPad. Each mutation run has one worker. `fail-fast: false`. A worker that leases nothing must still finish so it can record no-work.

Pool workers are not reduced by the mutation workers. iOS phone and Android therefore create 35 servers (32 pool, one B, shared SITE_2 and SITE_3). The site3 worker uses the shared SITE_3 and does not add a server. iPad creates 3. The control plane still refuses a batch above 40.

`retest-on-fail` stays false. A GitHub re-run of the whole workflow is a new `gh_run_attempt` and new Test System IO runs. Re-running a single failed worker does not re-run begin.

The orchestrator idles a run out 10 minutes after begin. Server create and provision take longer than that, and so can a simulator boot. Prepare counts the specs and refuses a commit that predates e2e-test-stack provisioning, which is the check that must happen before any server is created. Begin runs after provision, and `idle-timeout-ms` is 45 minutes so the workers can boot before the first lease. `lease-timeout-ms` is 30 minutes so a long spec is not reclaimed while it is still running.

## Jobs inside each v2 workflow

```
prepare
  checkout the commit under test
  refuse a commit that predates e2e-test-stack provisioning
  count pool, mutation-b, and mutation-site3 specs
  output identities, the worker matrix, and the server count

servers
  e2e-test-stack-create and e2e-test-stack-provision, unchanged workflows
  one server per pool worker, plus one for B when that run exists, plus shared SITE_2 and SITE_3
  the webhook sidecar when a pool spec is an mm_blocks spec

dispatch-begin, one job per run that has specs
  checkout that same commit and delete the specs that are not this run
  test-system-io-dispatch-begin
    framework: detox
    post-pending-commit-status: false
    retest-on-fail: false
  output run-id, total-units, report-url

dispatch-run (one matrix: every pool worker, plus a mutation worker per run)
  runner: macos-15 for iOS, ubuntu-latest-8-cores for Android
  download the build artifact from this GitHub run
  boot the simulator or emulator for detox-config
  Metro and the emulator are started in their own session, because this step ends before dispatch-run and the runner kills the step's process group
  point the worker at its own server, and at the shared SITE_2 and SITE_3
  a pool worker whose suite has mm_blocks also gets the batch webhook
  test-system-io-dispatch-run
    framework: detox
    detox-config: the lane's config
    batch-size: 1
    detox-max-workers: 1
    gh-job-name: the rendered job name

summary, one job per run that began
  if: always()
  checkout the workflow ref, not the commit under test
  test-system-io-summary
    framework: detox
    update-commit-status: false
    fail-on-test-failures: true
  output report-url
```

`batch-size: 1` and `detox-max-workers: 1` match one booted device per worker. Raising either means that worker must boot that many devices first.

The lane's GitHub result is the summary results. `e2e-test-ci.yml` results turns that into `e2e-test-stack/<lane>`. v2 outputs one `report-url` for that status: a failing run's report when one failed, otherwise the pool report. The pending status from setup keeps linking at the Actions run.

Summary does not get `statuses: write`. Begin and the workers do not either. Workers run the commit under test, so they stay on `contents: read`, `actions: read`, `id-token: write`. Prepare also has `pull-requests: read`, to read the pull request's head ref.

## Out of this cut

- An exclude-list on `test-system-io-dispatch-begin`. The begin checkout already drops the other files. A list input would replace that, and the manifest would still be the source.
- `@ipad_only` / `@ios_only` tags. Nothing in the tree has them.
- Maestro. Same three actions, `framework: maestro`, `batch-size` forced to 1.
- `e2e-test/*` required checks. Still owned by Matterwick, or by the dispatch skip statuses. Test System IO does not write them.
- Replacing `generate-specs` inside the current templates.
- Raising `batch-size` or `detox-max-workers` above 1.
- Orchestrator retest (`retest-on-fail`).
