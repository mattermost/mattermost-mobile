# Mobile E2E Skipped Tests Tracker — local update notes

Append-only notes for a human to copy into the
[Mobile E2E Skipped Tests Tracker](https://mattermost.atlassian.net/wiki/spaces/Security/pages/4783538198/Mobile+E2E+Skipped+Tests+Tracker).

## SEC-10781 / Branch 3 — `fix/mobile-e2e-diagnosis-cluster`

- **SEC-11046** (MM-T3196_1 manage-members, existing fix disproven) — Owner: QA-pending
  classification, no fix landed. Investigation: the cited run 30447839548's Detox
  Android machine shards ALL passed (gh-verified) — only the aggregate `detox-android`
  job failed, which looks like a reporting/TSIO issue, not a MM-T3196_1 failure. So
  the failure mechanism is unconfirmed in the available CI artifacts. Local repro is
  blocked (ephemeral test server torn down; no local API-35 emulator). The
  toBeVisible→waitForElementToExist swap was disproven and is NOT re-applied. Next
  step: a fresh repro on a stable server + Android emulator to capture the real
  artifact, then classify QA vs PE. Test stays skipped (rule 6).