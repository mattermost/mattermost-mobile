# Handoff: Multiple Concurrent Dialogs port

Porting mattermost/mattermost#37119 (multiple concurrent dialogs / `action_button`
interactive-dialog element) from webapp to mattermost-mobile.

- Branch: `mattermost-mobile-multiple-dialogs`
- Worktree (this machine): `/Users/sbishel/go/src/github.com/mattermost/mattermost-mobile-multiple-dialogs`
- Base: `main` (currently at `a058422c7` as of branch creation)
- Origin PR being ported: https://github.com/mattermost/mattermost/pull/37119
- Not yet pushed as of this handoff — user is pushing `origin/mattermost-mobile-multiple-dialogs`
  themselves (`git@github.com:mattermost/mattermost-mobile.git`).

## Status: code complete, unit-tested, NOT yet manually verified on-device

4 commits, one per phase, all with passing unit tests / tsc / eslint:

1. `e4bbfa811` — Add action_button dialog element type (data layer)
   Types (`types/api/integrations.d.ts`, `types/api/apps.d.ts`), `app/utils/dialog_utils.ts`,
   `app/utils/dialog_conversion.ts`, `app/constants/apps.ts`.
2. `c31c08ac4` — Rework IntegrationsManager to support concurrent dialogs
   `app/managers/integrations_manager.ts`: replaced scalar `triggerId`/`storedDialog` (which
   silently clobbered state when two dialog flows overlapped) with per-trigger-id
   Set/Map tracking + `MAX_OPEN_DIALOGS=3` cap (`app/constants/integrations.ts`) +
   `closeDialog()` cleanup wired into `app/routes/(modals)/dialog_router.tsx` unmount.
3. `0d71f4fae` — Add executeDialogAction client method + remote action
   `app/client/rest/integrations.ts`, `app/actions/remote/integrations.ts` — plumbing for
   `POST /actions/dialogs/execute`. No UI yet.
4. `020683dae` — Render action_button dialog fields as pressable buttons
   New `app/screens/apps_form/apps_form_field/apps_form_action_button.tsx`, wired into
   `apps_form_field.tsx`'s field-type switch. i18n key `interactive_dialog.action_button.error`
   added to `assets/base/i18n/en.json` only.

Full design rationale for why mobile's architecture didn't need webapp's Redux-map /
keyed-modal-ID changes (expo-router's `router.push` already stacks screens; the only real
gap was `IntegrationsManager`'s single scalar dialog slot) is in the conversation history —
not repeated here.

**Nothing has been manually verified running on a device yet.** That's the next step.

## What's left (task list, tracked via TaskCreate/TaskList in-session — not portable
automatically, recreate on the new machine if using tasks there too)

- [x] Phase 1-4 above — code + unit tests done, committed
- [ ] Phase 5: Manual E2E verification (user doing this), then an automated detox test in
      `detox/e2e/test/products/channels/interactive_dialog/` covering:
  - Two action_button presses on a parent dialog open two stacked child dialogs without
    closing the parent
  - Submitting/cancelling a child dialog doesn't affect siblings or the parent
  - `MAX_OPEN_DIALOGS=3` cap is enforced (a 4th concurrent dialog is dropped)
  - Needs a test webhook mirroring `e2e-tests/cypress/webhook_serve.js`'s
    `getActionButtonParentDialog`/`getActionButtonChildDialog` fixtures from the source
    webapp PR (`mattermost/mattermost` repo, same PR #37119) — the Demo Plugin used by
    existing detox interactive-dialog tests does NOT support `action_button` (it's brand
    new server-side), so a custom slash command + local webhook server is needed to
    produce a real `action_button` dialog to test against.

## Test server state (this machine)

- Local Mattermost server was running at `http://localhost:8065` (admin: `sysadmin` /
  `Sys@dmin-sample1`, from `detox/e2e/support/test_config.ts` defaults).
- **No plugins installed** on it (checked via `/api/v4/plugins` — both active/inactive empty).
  Whatever server the other machine tests against will need the same custom
  webhook/slash-command setup described above — there is nothing plugin-side to test
  `action_button` against out of the box.

## Environment gotchas hit on this machine (will likely recur on the other machine)

1. **`.ruby-version` pins Ruby 3.2.11**, but `ruby-build`'s default `rbenv install --list`
   filters out EOL Ruby versions (3.2 hit EOL ~March 2026), so a plain `rbenv install 3.2.11`
   fails with "definition not found" on an older `ruby-build`. Fix: `brew upgrade ruby-build`
   first (updates version definitions), then `rbenv install 3.2.11` works normally.
2. **Never run `npm install --ignore-scripts` in this repo.** It skips the `postinstall`
   chain (`patch-package && ./scripts/postinstall.sh`), which silently breaks the build in
   two ways that surfaced much later, far from the actual cause:
   - All `patch-package` patches in `patches/` go unapplied — in particular
     `ratex-react-native+0.1.4.patch` fixes a packaging bug in that pod's `source_files`
     glob (unpatched, it recurses into `RaTeX.xcframework`'s own `Headers/`, producing
     `ratex.h` twice → Xcode "Multiple commands produce ratex.h" build error).
   - `scripts/postinstall.sh` never runs, so `compass-icons.ttf` never gets copied into
     `assets/fonts/` (→ Xcode error building `MattermostShare`: "compass-icons.ttf couldn't
     be opened, no such file"), and `dist/assets/config.json`, the compass glyph map, and
     Android sound resources never get generated either.
   - **Fix if this happens again:** `npx patch-package && bash scripts/postinstall.sh`
     (the latter also reruns `pod install`). A normal `npm install` (no flags) runs all of
     this automatically via npm lifecycle — only `--ignore-scripts` breaks it.
3. **`npm run i18n-extract` defaults to a *sibling* directory.** `mmjstool`'s `--mobile-dir`
   default is `../mattermost-mobile` (a sibling checkout), not the current repo, so running
   the bare script here silently extracts against the wrong repo with no error/diff at all.
   When adding new i18n strings, run explicitly:
   `npx mmjstool i18n extract-mobile --mobile-dir .`
   (Verify only `assets/base/i18n/en.json` changes — never other language files, and never
   anything in a sibling repo.)
4. A `git worktree` cannot be relocated to another machine by copying the folder — its
   `.git` file points at an absolute path inside the *main* repo's
   `.git/worktrees/<name>/`, which won't resolve elsewhere. Get the branch onto the other
   machine via a normal git push/fetch (or a `git bundle` if not pushing to the shared
   remote), then `git worktree add` (or a plain `git checkout`) there — don't try to copy
   the worktree directory itself.

## Setup on the new machine (once the branch is fetched there)

```bash
# from wherever the mattermost-mobile main repo/worktrees live there:
git fetch origin mattermost-mobile-multiple-dialogs
git worktree add ../mattermost-mobile-multiple-dialogs mattermost-mobile-multiple-dialogs
cd ../mattermost-mobile-multiple-dialogs

npm install                 # full install — do NOT pass --ignore-scripts
# if `rbenv install --list` doesn't show 3.2.11: brew upgrade ruby-build first
npm run ios-gems             # bundle install
npm run pod-install          # cd ios && RCT_NEW_ARCH_ENABLED=1 pod install
npm run ios                  # or npm start && npm run ios if Metro isn't already up
```

If `npm run ios` fails with anything resembling gotcha #2 above, run
`npx patch-package && bash scripts/postinstall.sh` and retry.

## Uncommitted local noise (this machine, not carried over)

`ios/Podfile.lock` has a one-line local diff (a `hermes-engine` checksum) from re-running
`pod install` during troubleshooting — confirmed unrelated to any dependency change
(the `ratex-react-native` checksum was already correct in the committed file). Not worth
committing; will regenerate harmlessly on the new machine's own `pod install`.
