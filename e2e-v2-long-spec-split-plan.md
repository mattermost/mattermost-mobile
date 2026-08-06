# Plan: Split long Detox iOS specs (>4m)

Source report: [mobile-v2-pr-detox-ios / run 30951343934](https://staging-test-io.test.mattermost.com/reports/mattermost-mobile/pr-10006/3242f53/mobile-v2-pr-detox-ios?gh_run_id=30951343934&gh_run_attempt=1)

## Status (done)

- Split long `detox/e2e/test/products/**` multi-test specs into one-`it`-per-file specs.
- Filenames: short snake_case from the test title (not `mm-t####.e2e.ts`).
- Helper: `scripts/split_long_e2e_specs.py` (`it` / `it.skip` / aliases / ternary wrappers; `--rename-mm-t`).
- Also split: `interactive_dialog` (25) and `global_classification_banner` (10). Unskipped iOS skip on MM-T4201.
- Deleted: `detox/e2e/test/ci_filter_failed/**`.
- Left unsplit: `classification_banner_across_screens`, `classification_banner_offline` (not in this pass).
- **Timeouts not trimmed** yet.
- Individual tests already **&lt;5m** (even if &gt;3m) left alone for a later pass.

## Policy

- Target: each orchestrated **spec file** finishes in **≤3 minutes** (`actual_duration_ms` / UI clock next to the worker badge).
- This plan lists every first-pass attempt with **duration > 4 minutes** from the report above.
- Duration metric: `actual_duration_ms` (matches UI, e.g. `classification_banner_across_screens` = **4m 16s**).
- When a file has multiple tests: one new `.e2e.ts` per test (named from the MM-T id).
- `e2e/test/ci_filter_failed/**` copies are listed separately; prefer splitting the canonical `e2e/test/products/**` sources and deleting/regenerating the filter copies.

## Summary

- Specs >4m: **53** of 146 units
- Multi-test products files split: **49** → **232** files
- Excluded from this split: interactive_dialog + classification_banner (+ ci_filter_failed copies)
- Individual tests already >3m and &lt;5m: defer slimming
- Individual tests already >3m wall inside a suite (original inventory): **44**

## Index (all specs >4m)

| # | Duration | Tests | Status | Spec |
|---|----------|------:|--------|------|
| 1 | 84m 4s | 25 | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` |
| 2 | 40m 34s | 25 | passed | `e2e/test/ci_filter_failed/interactive_dialog_plugin.e2e.ts` |
| 3 | 33m 16s | 10 | failed | `e2e/test/ci_filter_failed/global_classification_banner.e2e.ts` |
| 4 | 14m 29s | 6 | passed | `e2e/test/products/channels/messaging/message_permalink.e2e.ts` |
| 5 | 12m 41s | 6 | passed | `e2e/test/products/channels/channels/archive_channel_from_settings.e2e.ts` |
| 6 | 11m 41s | 11 | passed | `e2e/test/products/channels/channels/channel_bookmarks.e2e.ts` |
| 7 | 10m 53s | 5 | passed | `e2e/test/products/channels/search/search_recents.e2e.ts` |
| 8 | 10m 46s | 7 | passed | `e2e/test/products/channels/smoke_test/messaging.e2e.ts` |
| 9 | 10m 39s | 8 | passed | `e2e/test/products/channels/channels/browse_channels.e2e.ts` |
| 10 | 10m 18s | 8 | passed | `e2e/test/products/channels/account/custom_status.e2e.ts` |
| 11 | 10m 12s | 4 | passed | `e2e/test/products/channels/search/search_results.e2e.ts` |
| 12 | 10m 10s | 4 | passed | `e2e/test/products/channels/threads/follow_and_unfollow_thread.e2e.ts` |
| 13 | 9m 39s | 6 | passed | `e2e/test/products/channels/smoke_test/channels.e2e.ts` |
| 14 | 9m 35s | 5 | passed | `e2e/test/products/channels/messaging/file_upload.e2e.ts` |
| 15 | 9m 27s | 8 | passed | `e2e/test/products/channels/autocomplete/channel_post_draft.e2e.ts` |
| 16 | 9m 21s | 7 | passed | `e2e/test/products/channels/channel_settings/channel_create_edit.e2e.ts` |
| 17 | 9m | 9 | passed | `e2e/test/products/channels/channels/channel_list.e2e.ts` |
| 18 | 8m 54s | 4 | passed | `e2e/test/products/channels/search/hashtag_search.e2e.ts` |
| 19 | 8m 40s | 5 | passed | `e2e/test/products/channels/threads/global_threads.e2e.ts` |
| 20 | 8m 25s | 7 | passed | `e2e/test/products/channels/messaging/file_preview_gallery.e2e.ts` |
| 21 | 8m 12s | 4 | passed | `e2e/test/products/channels/smoke_test/search.e2e.ts` |
| 22 | 7m 49s | 6 | passed | `e2e/test/products/channels/channel_settings/channel_members.e2e.ts` |
| 23 | 7m 32s | 6 | passed | `e2e/test/products/channels/messaging/message_local_drafts.e2e.ts` |
| 24 | 7m 5s | 6 | passed | `e2e/test/products/channels/teams/invite_people.e2e.ts` |
| 25 | 6m 51s | 4 | passed | `e2e/test/products/channels/messaging/permalink.e2e.ts` |
| 26 | 6m 44s | 5 | passed | `e2e/test/products/channels/channels/create_direct_message.e2e.ts` |
| 27 | 6m 31s | 6 | passed | `e2e/test/products/channels/messaging/emoji_display.e2e.ts` |
| 28 | 6m 30s | 3 | passed | `e2e/test/products/channels/messaging/message_edit.e2e.ts` |
| 29 | 6m 30s | 7 | passed | `e2e/test/products/channels/server_login/server_list.e2e.ts` |
| 30 | 6m 25s | 2 | passed | `e2e/test/products/channels/threads/open_thread_in_channel.e2e.ts` |
| 31 | 6m 17s | 3 | passed | `e2e/test/products/channels/channels/favorite_and_unfavorite_channel.e2e.ts` |
| 32 | 6m 7s | 2 | passed | `e2e/test/products/channels/smoke_test/threads.e2e.ts` |
| 33 | 6m 6s | 4 | passed | `e2e/test/products/channels/messaging/message_delete.e2e.ts` |
| 34 | 6m 6s | 3 | passed | `e2e/test/products/channels/messaging/message_reply.e2e.ts` |
| 35 | 6m | 3 | passed | `e2e/test/products/channels/channels/archive_channel.e2e.ts` |
| 36 | 5m 46s | 3 | passed | `e2e/test/products/channels/messaging/message_post.e2e.ts` |
| 37 | 5m 44s | 4 | passed | `e2e/test/products/channels/channels/edit_channel.e2e.ts` |
| 38 | 5m 37s | 5 | passed | `e2e/test/products/channels/messaging/emojis_and_reactions.e2e.ts` |
| 39 | 5m 33s | 2 | passed | `e2e/test/products/channels/threads/reply_to_thread.e2e.ts` |
| 40 | 5m 23s | 2 | passed | `e2e/test/products/channels/threads/save_and_unsave_thread.e2e.ts` |
| 41 | 5m 17s | 3 | passed | `e2e/test/products/channels/threads/mark_thread_as_read_and_unread.e2e.ts` |
| 42 | 5m 13s | 4 | passed | `e2e/test/products/channels/messaging/at_mention.e2e.ts` |
| 43 | 5m 8s | 9 | passed | `e2e/test/products/channels/account/account_menu.e2e.ts` |
| 44 | 5m 8s | 2 | passed | `e2e/test/products/channels/messaging/save_and_unsave_message.e2e.ts` |
| 45 | 5m 2s | 3 | passed | `e2e/test/products/channels/search/search_cycle.e2e.ts` |
| 46 | 4m 57s | 3 | passed | `e2e/test/products/channels/channels/create_channel_and_edit_channel_header.e2e.ts` |
| 47 | 4m 43s | 3 | passed | `e2e/test/products/channels/messaging/post_display_behavior.e2e.ts` |
| 48 | 4m 38s | 3 | passed | `e2e/test/products/channels/account/account_profile_picture.e2e.ts` |
| 49 | 4m 34s | 3 | passed | `e2e/test/products/channels/channels/leave_channel.e2e.ts` |
| 50 | 4m 31s | 2 | passed | `e2e/test/products/channels/channels/unarchive_channel.e2e.ts` |
| 51 | 4m 16s | 5 | failed | `e2e/test/ci_filter_failed/classification_banner_across_screens.e2e.ts` |
| 52 | 4m 12s | 3 | passed | `e2e/test/products/channels/autocomplete/at_mention_user_filters.e2e.ts` |
| 53 | 4m 7s | 4 | passed | `e2e/test/products/channels/search/recent_mentions.e2e.ts` |

## Split plan (multi-test files)

For each file: keep a thin shared helper/import if needed; move each `it`/`test` into its own file named from the MM-T id.

### `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts`

- First-pass duration: **84m 4s** · status `failed` · 25 tests (24 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/interactive_dialog/mm-t4101.e2e.ts` ← `MM-T4101 should open simple interactive dialog (Plugin)` (3m 30s, failed) **⚠ single test already 3m 30s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4102.e2e.ts` ← `MM-T4102 should submit simple interactive dialog (Plugin)` (3m 28s, failed) **⚠ single test already 3m 28s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4103.e2e.ts` ← `MM-T4103 should fill text field and submit dialog (Plugin)` (3m 31s, failed) **⚠ single test already 3m 31s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4104.e2e.ts` ← `MM-T4104 should handle server error on dialog submission (Plugin)` (3m 31s, failed) **⚠ single test already 3m 31s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4401.e2e.ts` ← `MM-T4401 should toggle boolean fields and submit (Plugin)` (3m 30s, failed) **⚠ single test already 3m 30s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4402.e2e.ts` ← `MM-T4402 should handle boolean field validation (Plugin)` (3m 28s, failed) **⚠ single test already 3m 28s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4498.e2e.ts` ← `MM-T4498 should open and handle interactive dialog with select fields (Plugin)` (3m 28s, failed) **⚠ single test already 3m 28s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4499.e2e.ts` ← `MM-T4499 should handle required select field validation (Plugin)` (3m 27s, failed) **⚠ single test already 3m 27s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4500.e2e.ts` ← `MM-T4500 should handle different selector types (Plugin)` (3m 27s, failed) **⚠ single test already 3m 27s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4201.e2e.ts` ← `MM-T4201 should fill and submit all text field types (Plugin)` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/interactive_dialog/mm-t4202.e2e.ts` ← `MM-T4202 should validate required text field (Plugin)` (3m 27s, failed) **⚠ single test already 3m 27s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4203.e2e.ts` ← `MM-T4203 should handle different text input subtypes (Plugin)` (3m 35s, failed) **⚠ single test already 3m 35s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4976.e2e.ts` ← `MM-T4976 should handle multiselect fields dialog (Plugin)` (3m 31s, failed) **⚠ single test already 3m 31s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4977.e2e.ts` ← `MM-T4977 should handle dynamic select fields dialog (Plugin)` (3m 30s, failed) **⚠ single test already 3m 30s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4980.e2e.ts` ← `MM-T4980 should complete multistep dialog progression (Plugin)` (3m 28s, failed) **⚠ single test already 3m 28s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4981.e2e.ts` ← `MM-T4981 should handle multistep dialog cancellation (Plugin)` (3m 31s, failed) **⚠ single test already 3m 31s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4983.e2e.ts` ← `MM-T4983 should handle field refresh basic interaction (Plugin)` (3m 33s, failed) **⚠ single test already 3m 33s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t4986.e2e.ts` ← `MM-T4986 should handle field refresh changes and cancellation (Plugin)` (3m 31s, failed) **⚠ single test already 3m 31s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t2530a.e2e.ts` ← `MM-T2530A should open date/datetime dialog and display fields` (3m 32s, failed) **⚠ single test already 3m 32s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t2530b.e2e.ts` ← `MM-T2530B should validate required date/datetime fields` (3m 30s, failed) **⚠ single test already 3m 30s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t2530c.e2e.ts` ← `MM-T2530C should select date and display formatted value` (3m 29s, failed) **⚠ single test already 3m 29s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t2530d.e2e.ts` ← `MM-T2530D should display relative date defaults` (3m 33s, failed) **⚠ single test already 3m 33s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t2530f.e2e.ts` ← `MM-T2530F should verify UTC conversion for datetime values` (3m 33s, failed) **⚠ single test already 3m 33s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t2530g.e2e.ts` ← `MM-T2530G should display timezone indicator and convert to UTC correctly` (3m 32s, failed) **⚠ single test already 3m 32s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/interactive_dialog/mm-t2530h.e2e.ts` ← `MM-T2530H should accept manual time entry on datetime field` (3m 29s, failed) **⚠ single test already 3m 29s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/ci_filter_failed/interactive_dialog_plugin.e2e.ts`

- First-pass duration: **40m 34s** · status `passed` · 25 tests (24 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/ci_filter_failed/mm-t4101.e2e.ts` ← `MM-T4101 should open simple interactive dialog (Plugin)` (1m 15s, passed)
  - `e2e/test/ci_filter_failed/mm-t4102.e2e.ts` ← `MM-T4102 should submit simple interactive dialog (Plugin)` (1m 20s, passed)
  - `e2e/test/ci_filter_failed/mm-t4103.e2e.ts` ← `MM-T4103 should fill text field and submit dialog (Plugin)` (1m 37s, passed)
  - `e2e/test/ci_filter_failed/mm-t4104.e2e.ts` ← `MM-T4104 should handle server error on dialog submission (Plugin)` (1m 35s, passed)
  - `e2e/test/ci_filter_failed/mm-t4401.e2e.ts` ← `MM-T4401 should toggle boolean fields and submit (Plugin)` (1m 29s, passed)
  - `e2e/test/ci_filter_failed/mm-t4402.e2e.ts` ← `MM-T4402 should handle boolean field validation (Plugin)` (1m 33s, passed)
  - `e2e/test/ci_filter_failed/mm-t4498.e2e.ts` ← `MM-T4498 should open and handle interactive dialog with select fields (Plugin)` (2m 1s, passed)
  - `e2e/test/ci_filter_failed/mm-t4499.e2e.ts` ← `MM-T4499 should handle required select field validation (Plugin)` (1m 47s, passed)
  - `e2e/test/ci_filter_failed/mm-t4500.e2e.ts` ← `MM-T4500 should handle different selector types (Plugin)` (1m 58s, passed)
  - `e2e/test/ci_filter_failed/mm-t4201.e2e.ts` ← `MM-T4201 should fill and submit all text field types (Plugin)` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/ci_filter_failed/mm-t4202.e2e.ts` ← `MM-T4202 should validate required text field (Plugin)` (2m 5s, passed)
  - `e2e/test/ci_filter_failed/mm-t4203.e2e.ts` ← `MM-T4203 should handle different text input subtypes (Plugin)` (1m 59s, passed)
  - `e2e/test/ci_filter_failed/mm-t4976.e2e.ts` ← `MM-T4976 should handle multiselect fields dialog (Plugin)` (2m 20s, passed) _(close to budget: 2m 20s)_
  - `e2e/test/ci_filter_failed/mm-t4977.e2e.ts` ← `MM-T4977 should handle dynamic select fields dialog (Plugin)` (1m 52s, passed)
  - `e2e/test/ci_filter_failed/mm-t4980.e2e.ts` ← `MM-T4980 should complete multistep dialog progression (Plugin)` (2m 41s, passed) _(close to budget: 2m 41s)_
  - `e2e/test/ci_filter_failed/mm-t4981.e2e.ts` ← `MM-T4981 should handle multistep dialog cancellation (Plugin)` (2m 1s, passed)
  - `e2e/test/ci_filter_failed/mm-t4983.e2e.ts` ← `MM-T4983 should handle field refresh basic interaction (Plugin)` (2m 10s, passed)
  - `e2e/test/ci_filter_failed/mm-t4986.e2e.ts` ← `MM-T4986 should handle field refresh changes and cancellation (Plugin)` (1m 28s, passed)
  - `e2e/test/ci_filter_failed/mm-t2530a.e2e.ts` ← `MM-T2530A should open date/datetime dialog and display fields` (1m 15s, passed)
  - `e2e/test/ci_filter_failed/mm-t2530b.e2e.ts` ← `MM-T2530B should validate required date/datetime fields` (1m 10s, passed)
  - `e2e/test/ci_filter_failed/mm-t2530c.e2e.ts` ← `MM-T2530C should select date and display formatted value` (1m 16s, passed)
  - `e2e/test/ci_filter_failed/mm-t2530d.e2e.ts` ← `MM-T2530D should display relative date defaults` (1m 10s, passed)
  - `e2e/test/ci_filter_failed/mm-t2530f.e2e.ts` ← `MM-T2530F should verify UTC conversion for datetime values` (1m 32s, passed)
  - `e2e/test/ci_filter_failed/mm-t2530g.e2e.ts` ← `MM-T2530G should display timezone indicator and convert to UTC correctly` (1m 30s, passed)
  - `e2e/test/ci_filter_failed/mm-t2530h.e2e.ts` ← `MM-T2530H should accept manual time entry on datetime field` (1m 31s, passed)

### `e2e/test/ci_filter_failed/global_classification_banner.e2e.ts`

- First-pass duration: **33m 16s** · status `failed` · 10 tests (10 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/ci_filter_failed/mm-t6196-1.e2e.ts` ← `MM-T6196_1 - should not render the banner when the feature flag is off` (2m 23s, passed) _(close to budget: 2m 23s)_
  - `e2e/test/ci_filter_failed/mm-t6197-1.e2e.ts` ← `MM-T6197_1 - should render the banner on the channel list screen when classification is configured` (4m 41s, passed) **⚠ single test already 4m 41s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/ci_filter_failed/mm-t6198-1.e2e.ts` ← `MM-T6198_1 - should render the banner on the channel screen when classification is configured` (2m 42s, failed) _(close to budget: 2m 42s)_
  - `e2e/test/ci_filter_failed/mm-t6199-1.e2e.ts` ← `MM-T6199_1 - should render the banner on the global threads screen when classification is configured` (4m 55s, failed) **⚠ single test already 4m 55s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/ci_filter_failed/mm-t6200-1.e2e.ts` ← `MM-T6200_1 - should not render the banner when no classification value is set` (2m 18s, passed) _(close to budget: 2m 18s)_
  - `e2e/test/ci_filter_failed/mm-t6201-1.e2e.ts` ← `MM-T6201_1 - should persist the banner across channel navigation` (2m 31s, passed) _(close to budget: 2m 31s)_
  - `e2e/test/ci_filter_failed/mm-t6202-1.e2e.ts` ← `MM-T6202_1 - should update the banner when classification level changes` (2m 24s, passed) _(close to budget: 2m 24s)_
  - `e2e/test/ci_filter_failed/mm-t6203-1.e2e.ts` ← `MM-T6203_1 - should remove the banner when classification configuration is deleted` (3m 9s, passed) **⚠ single test already 3m 9s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/ci_filter_failed/mm-t6204-1.e2e.ts` ← `MM-T6204_1 - should remove the banner when the feature flag is toggled off` (3m 1s, failed) **⚠ single test already 3m 1s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/ci_filter_failed/mm-t6205-1.e2e.ts` ← `MM-T6205_1 - should not render the banner on the channel screen when classification is removed while on channel list` (5m 13s, failed) **⚠ single test already 5m 13s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/products/channels/messaging/message_permalink.e2e.ts`

- First-pass duration: **14m 29s** · status `passed` · 6 tests (6 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t4877-1.e2e.ts` ← `MM-T4877_1 - should render permalink preview modal when posting a message with copied permalink` (1m 34s, passed)
  - `e2e/test/products/channels/messaging/mm-t4877-2.e2e.ts` ← `MM-T4877_2 - should copy link and create permalink preview in different channel` (2m 1s, passed)
  - `e2e/test/products/channels/messaging/mm-t4877-3.e2e.ts` ← `MM-T4877_3 - should navigate to original post when tapping on permalink preview` (2m 16s, passed) _(close to budget: 2m 16s)_
  - `e2e/test/products/channels/messaging/mm-t4877-4.e2e.ts` ← `MM-T4877_4 - should update permalink preview when original post is edited` (2m 53s, passed) _(close to budget: 2m 53s)_
  - `e2e/test/products/channels/messaging/mm-t4877-6.e2e.ts` ← `MM-T4877_6 - should handle permalink preview with long message content` (1m 56s, passed)
  - `e2e/test/products/channels/messaging/mm-t4877-7.e2e.ts` ← `MM-T4877_7 - should handle permalink preview when original post is deleted` (3m 49s, passed) **⚠ single test already 3m 49s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/products/channels/channels/archive_channel_from_settings.e2e.ts`

- First-pass duration: **12m 41s** · status `passed` · 6 tests (6 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4932-1.e2e.ts` ← `MM-T4932_1 - should be able to archive a public channel and confirm` (2m 24s, passed) _(close to budget: 2m 24s)_
  - `e2e/test/products/channels/channels/mm-t4932-2.e2e.ts` ← `MM-T4932_2 - should be able to archive a public channel and cancel` (1m 13s, passed)
  - `e2e/test/products/channels/channels/mm-t4932-3.e2e.ts` ← `MM-T4932_3 - should be able to archive a private channel and confirm` (2m 25s, passed) _(close to budget: 2m 25s)_
  - `e2e/test/products/channels/channels/mm-t3208.e2e.ts` ← `MM-T3208 - should show confirmation dialog when archiving a channel and archive on confirm` (1m 36s, passed)
  - `e2e/test/products/channels/channels/mm-t1697-1.e2e.ts` ← `MM-T1697_1 - should show archived channels option in browse public channels dropdown` (1m 25s, passed)
  - `e2e/test/products/channels/channels/mm-t1703-1.e2e.ts` ← `MM-T1703_1 - should be able to open archived channels and verify read-only state` (3m 38s, passed) **⚠ single test already 3m 38s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/products/channels/channels/channel_bookmarks.e2e.ts`

- First-pass duration: **11m 41s** · status `passed` · 11 tests (8 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t5600-1.e2e.ts` ← `MM-T5600_1 - should show Add bookmark option in channel info on licensed server` (1m 12s, passed)
  - `e2e/test/products/channels/channels/mm-t5601-1.e2e.ts` ← `MM-T5601_1 - should show Add bookmark option when no bookmarks exist in channel` (1m 20s, passed)
  - `e2e/test/products/channels/channels/mm-t5602-1.e2e.ts` ← `MM-T5602_1 - should be able to add a bookmark link via channel info` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/channels/mm-t5608-1.e2e.ts` ← `MM-T5608_1 - should show error when adding a bookmark with an invalid URL` (1m 53s, passed)
  - `e2e/test/products/channels/channels/mm-t5604-1.e2e.ts` ← `MM-T5604_1 - should auto-populate title from page when adding a bookmark link` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/channels/mm-t5605-1.e2e.ts` ← `MM-T5605_1 - should show fallback bookmark icon when no favicon is found` (1m 11s, passed)
  - `e2e/test/products/channels/channels/mm-t5606-1.e2e.ts` ← `MM-T5606_1 - should be able to change the icon/emoji of a bookmark` (2m 18s, passed) _(close to budget: 2m 18s)_
  - `e2e/test/products/channels/channels/mm-t5607-1.e2e.ts` ← `MM-T5607_1 - should be able to revert bookmark icon from emoji to default` (1m 29s, passed)
  - `e2e/test/products/channels/channels/mm-t5609-1.e2e.ts` ← `MM-T5609_1 - should display bookmark bar below channel header` (1m 4s, passed)
  - `e2e/test/products/channels/channels/mm-t5612-1.e2e.ts` ← `MM-T5612_1 - should show scroll indicator when bookmarks exceed visible limit` (1m 14s, passed)
  - `e2e/test/products/channels/channels/mm-t69455-1.e2e.ts` ← `MM-T69455_1 - should open file preview on tap and options on long press` (0s, skipped) _(skipped in this run — still split so it can run alone)_

### `e2e/test/products/channels/search/search_recents.e2e.ts`

- First-pass duration: **10m 53s** · status `passed` · 5 tests (5 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/search/mm-t351-1.e2e.ts` ← `MM-T351_1 - wildcard (*) disregarded if not preceded by text` (1m 14s, passed)
  - `e2e/test/products/channels/search/mm-t352-1.e2e.ts` ← `MM-T352_1 - cleared search term should not reappear` (1m 8s, passed)
  - `e2e/test/products/channels/search/mm-t355-1.e2e.ts` ← `MM-T355_1 - old results not combined with new results` (3m 4s, passed) **⚠ single test already 3m 4s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/search/mm-t3238-1.e2e.ts` ← `MM-T3238_1 - delete one previous search, tap on another` (3m 7s, passed) **⚠ single test already 3m 7s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/search/mm-t366-1.e2e.ts` ← `MM-T366_1 - focus does not stay in search box after search` (2m 20s, passed) _(close to budget: 2m 20s)_

### `e2e/test/products/channels/smoke_test/messaging.e2e.ts`

- First-pass duration: **10m 46s** · status `passed` · 7 tests (6 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/smoke_test/mm-t4786-1.e2e.ts` ← `MM-T4786_1 - should be able to post, edit, and delete a message` (2m 11s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4786-2.e2e.ts` ← `MM-T4786_2 - should be able to reply to a message` (1m 55s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4786-3.e2e.ts` ← `MM-T4786_3 - should be able to include emojis in a message and add reaction to a message` (2m 4s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4786-4.e2e.ts` ← `MM-T4786_4 - should be able to follow/unfollow a message, save/unsave a message, and pin/unpin a message` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/smoke_test/mm-t4786-5.e2e.ts` ← `MM-T4786_5 - should be able to post a message with at-mention and channel mention` (1m 34s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4786-6.e2e.ts` ← `MM-T4786_6 - should be able to post labeled permalink and labeled channel link` (1m 31s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4786-7.e2e.ts` ← `MM-T4786_7 - should be able to post a message with markdown` (1m 31s, passed)

### `e2e/test/products/channels/channels/browse_channels.e2e.ts`

- First-pass duration: **10m 39s** · status `passed` · 8 tests (7 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4729-1.e2e.ts` ← `MM-T4729_1 - should match elements on browse channels screen` (1m 11s, passed)
  - `e2e/test/products/channels/channels/mm-t4729-2.e2e.ts` ← `MM-T4729_2 - should be able to browse and join an unjoined public channel` (1m 46s, passed)
  - `e2e/test/products/channels/channels/mm-t4729-3.e2e.ts` ← `MM-T4729_3 - should display empty search state for browse channels` (1m 19s, passed)
  - `e2e/test/products/channels/channels/mm-t4729-4.e2e.ts` ← `MM-T4729_4 - should not be able to browse direct and group message channels` (1m 24s, passed)
  - `e2e/test/products/channels/channels/mm-t4729-5.e2e.ts` ← `MM-T4729_5 - should be able to browse an archived channel` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/channels/mm-t4729-6.e2e.ts` ← `MM-T4729_6 - should not be able to browse a joined public channel` (1m 43s, passed)
  - `e2e/test/products/channels/channels/mm-t4729-7.e2e.ts` ← `MM-T4729_7 - should not be able to browse joined and unjoined private channel` (1m 42s, passed)
  - `e2e/test/products/channels/channels/mm-t864-1.e2e.ts` ← `MM-T864_1 - should be able to search for a public channel, cancel search, and join via browse channels` (1m 34s, passed)

### `e2e/test/products/channels/account/custom_status.e2e.ts`

- First-pass duration: **10m 18s** · status `passed` · 8 tests (6 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/account/mm-t4990-1.e2e.ts` ← `MM-T4990_1 - should match elements on custom status screen` (48s, passed)
  - `e2e/test/products/channels/account/mm-t4990-2.e2e.ts` ← `MM-T4990_2 - should be able to set a status via suggestions` (1m 3s, passed)
  - `e2e/test/products/channels/account/mm-t4990-3.e2e.ts` ← `MM-T4990_3 - should be able to set a status via emoji picker and custom status` (1m 29s, passed)
  - `e2e/test/products/channels/account/mm-t4990-4.e2e.ts` ← `MM-T4990_4 - should be able to clear custom status from account` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/account/mm-t3890.e2e.ts` ← `MM-T3890 - should be able to select and reselect suggested status` (1m 11s, passed)
  - `e2e/test/products/channels/account/mm-t3891.e2e.ts` ← `MM-T3891 - should be able to set custom status with emoji picker and manage it` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/account/mm-t3892.e2e.ts` ← `MM-T3892 - should manage recent custom statuses correctly` (1m 33s, passed)
  - `e2e/test/products/channels/account/mm-t4091.e2e.ts` ← `MM-T4091 - should be able to set custom status with expiry time and verify in various locations` (4m 15s, passed) **⚠ single test already 4m 15s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/products/channels/search/search_results.e2e.ts`

- First-pass duration: **10m 12s** · status `passed` · 4 tests (4 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/search/mm-t3239-1.e2e.ts` ← `MM-T3239_1 - long list of search results is scrollable` (1m 37s, passed)
  - `e2e/test/products/channels/search/mm-t3240-1.e2e.ts` ← `MM-T3240_1 - no option to Add Reaction on search results` (2m 43s, passed) _(close to budget: 2m 43s)_
  - `e2e/test/products/channels/search/mm-t380-1.e2e.ts` ← `MM-T380_1 - link opens for post not displaying in center` (2m 35s, passed) _(close to budget: 2m 35s)_
  - `e2e/test/products/channels/search/mm-t372-1.e2e.ts` ← `MM-T372_1 - highlighting does not persist in Saved Messages` (3m 16s, passed) **⚠ single test already 3m 16s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/products/channels/threads/follow_and_unfollow_thread.e2e.ts`

- First-pass duration: **10m 10s** · status `passed` · 4 tests (4 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/threads/mm-t4806-1.e2e.ts` ← `MM-T4806_1 - should be able to follow/unfollow a thread via thread navigation` (2m 14s, passed)
  - `e2e/test/products/channels/threads/mm-t4806-2.e2e.ts` ← `MM-T4806_2 - should be able to follow/unfollow a thread via post footer` (2m 12s, passed)
  - `e2e/test/products/channels/threads/mm-t4806-3.e2e.ts` ← `MM-T4806_3 - should be able to follow/unfollow a thread via post options` (3m 17s, passed) **⚠ single test already 3m 17s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/threads/mm-t4806-4.e2e.ts` ← `MM-T4806_4 - should be able to unfollow a thread via thread options` (2m 26s, passed) _(close to budget: 2m 26s)_

### `e2e/test/products/channels/smoke_test/channels.e2e.ts`

- First-pass duration: **9m 39s** · status `passed` · 6 tests (5 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/smoke_test/mm-t4774-1.e2e.ts` ← `MM-T4774_1 - should be able to join a new channel and switch to an existing channel` (1m 58s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4774-2.e2e.ts` ← `MM-T4774_2 - should be able to create a channel and create a direct message` (3m 21s, passed) **⚠ single test already 3m 21s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/smoke_test/mm-t4774-3.e2e.ts` ← `MM-T4774_3 - should be able to post a message in a channel` (1m 28s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4774-4.e2e.ts` ← `MM-T4774_4 - should be able to find and edit a channel` (1m 27s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4774-5.e2e.ts` ← `MM-T4774_5 - should be able to favorite and mute a channel` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/smoke_test/mm-t4774-6.e2e.ts` ← `MM-T4774_6 - should be able to archive and leave a channel` (1m 25s, passed)

### `e2e/test/products/channels/messaging/file_upload.e2e.ts`

- First-pass duration: **9m 35s** · status `passed` · 5 tests (5 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t307-1.e2e.ts` ← `MM-T307_1 - should cancel a file upload by removing the attachment from the draft` (1m 6s, passed)
  - `e2e/test/products/channels/messaging/mm-t325-1.e2e.ts` ← `MM-T325_1 - should show attachment in the reply thread view` (1m 30s, passed)
  - `e2e/test/products/channels/messaging/mm-t328-1.e2e.ts` ← `MM-T328_1 - should show multiple attachments in post after sending via API` (1m 35s, passed)
  - `e2e/test/products/channels/messaging/mm-t339-1.e2e.ts` ← `MM-T339_1 - should show an error when the server max file size is set to a very small value` (4m 34s, passed) **⚠ single test already 4m 34s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/messaging/mm-t330-1.e2e.ts` ← `MM-T330_1 - iOS only — inline image with size specified renders in the channel` (51s, passed)

### `e2e/test/products/channels/autocomplete/channel_post_draft.e2e.ts`

- First-pass duration: **9m 27s** · status `passed` · 8 tests (8 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/autocomplete/mm-t4882-1.e2e.ts` ← `MM-T4882_1 - should render at-mention autocomplete in post input` (1m 12s, passed)
  - `e2e/test/products/channels/autocomplete/mm-t4882-2.e2e.ts` ← `MM-T4882_2 - should render channel mention autocomplete in post input` (1m 11s, passed)
  - `e2e/test/products/channels/autocomplete/mm-t4882-3.e2e.ts` ← `MM-T4882_3 - should render emoji suggestion autocomplete in post input` (1m 10s, passed)
  - `e2e/test/products/channels/autocomplete/mm-t4882-4.e2e.ts` ← `MM-T4882_4 - should render slash suggestion autocomplete in post input` (1m 13s, passed)
  - `e2e/test/products/channels/autocomplete/mm-t3392-1.e2e.ts` ← `MM-T3392_1 - should render emoji suggestion component when typing : in post input` (1m 11s, passed)
  - `e2e/test/products/channels/autocomplete/mm-t3392-2.e2e.ts` ← `MM-T3392_2 - should render at-mention component when typing @ in post input` (1m 10s, passed)
  - `e2e/test/products/channels/autocomplete/mm-t3392-3.e2e.ts` ← `MM-T3392_3 - should render channel mention component when typing ~ in post input` (1m 11s, passed)
  - `e2e/test/products/channels/autocomplete/mm-t3392-4.e2e.ts` ← `MM-T3392_4 - should render slash suggestion component when typing / in post input` (1m 9s, passed)

### `e2e/test/products/channels/channel_settings/channel_create_edit.e2e.ts`

- First-pass duration: **9m 21s** · status `passed` · 7 tests (7 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channel_settings/mm-t3201.e2e.ts` ← `MM-T3201 - RN apps Create public channel` (1m 13s, passed)
  - `e2e/test/products/channels/channel_settings/mm-t3203.e2e.ts` ← `MM-T3203 - RN apps Create private channel` (1m 5s, passed)
  - `e2e/test/products/channels/channel_settings/mm-t3199.e2e.ts` ← `MM-T3199 - RN apps Edit public channel` (1m 28s, passed)
  - `e2e/test/products/channels/channel_settings/mm-t3206.e2e.ts` ← `MM-T3206 - RN apps Edit private channel` (1m 28s, passed)
  - `e2e/test/products/channels/channel_settings/mm-t854.e2e.ts` ← `MM-T854 - RN apps Channel can be created using 2 non-latin characters` (1m 15s, passed)
  - `e2e/test/products/channels/channel_settings/mm-t867.e2e.ts` ← `MM-T867 - RN apps Copying channel header text` (1m 28s, passed)
  - `e2e/test/products/channels/channel_settings/mm-t865.e2e.ts` ← `MM-T865 - RN apps Copying channel purpose text` (1m 24s, passed)

### `e2e/test/products/channels/channels/channel_list.e2e.ts`

- First-pass duration: **9m** · status `passed` · 9 tests (9 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4728-1.e2e.ts` ← `MM-T4728_1 - should match elements on channel list screen` (23s, passed)
  - `e2e/test/products/channels/channels/mm-t4728-2.e2e.ts` ← `MM-T4728_2 - should be able to switch between channels` (1m 32s, passed)
  - `e2e/test/products/channels/channels/mm-t4728-3.e2e.ts` ← `MM-T4728_3 - should be able to collapse and expand categories` (1m 46s, passed)
  - `e2e/test/products/channels/channels/mm-t4728-4.e2e.ts` ← `MM-T4728_4 - should be able to go to browse channels screen` (1m 5s, passed)
  - `e2e/test/products/channels/channels/mm-t4728-5.e2e.ts` ← `MM-T4728_5 - should be able to go to create direct message screen` (1m 30s, passed)
  - `e2e/test/products/channels/channels/mm-t4728-6.e2e.ts` ← `MM-T4728_6 - should be able to go to create channel screen` (1m, passed)
  - `e2e/test/products/channels/channels/mm-t4728-7.e2e.ts` ← `MM-T4728_7 - should be able to go to global threads screen` (24s, passed)
  - `e2e/test/products/channels/channels/mm-t4728-8.e2e.ts` ← `MM-T4728_8 - should be able to go to find channels screen` (29s, passed)
  - `e2e/test/products/channels/channels/mm-t3249.e2e.ts` ← `MM-T3249 - should be able to switch between teams` (51s, passed)

### `e2e/test/products/channels/search/hashtag_search.e2e.ts`

- First-pass duration: **8m 54s** · status `passed` · 4 tests (4 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/search/mm-t356-1.e2e.ts` ← `MM-T356_1 - should be able to search for a hashtag and view the post in results` (2m 1s, passed)
  - `e2e/test/products/channels/search/mm-t357-1.e2e.ts` ← `MM-T357_1 - should be able to open a reply thread from hashtag search results and see hashtag links` (1m 57s, passed)
  - `e2e/test/products/channels/search/mm-t360-1.e2e.ts` ← `MM-T360_1 - should show hashtag in Recent Mentions and allow tapping it to trigger hashtag search` (1m 34s, passed)
  - `e2e/test/products/channels/search/mm-t361-1.e2e.ts` ← `MM-T361_1 - should be able to tap a hashtag in Saved Messages to trigger a hashtag search` (3m 22s, passed) **⚠ single test already 3m 22s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/products/channels/threads/global_threads.e2e.ts`

- First-pass duration: **8m 40s** · status `passed` · 5 tests (5 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/threads/mm-t4805-1.e2e.ts` ← `MM-T4805_1 - should match elements on global threads screen` (26s, passed)
  - `e2e/test/products/channels/threads/mm-t4805-2.e2e.ts` ← `MM-T4805_2 - should be able to go to a thread a user started and followed` (2m 31s, passed) _(close to budget: 2m 31s)_
  - `e2e/test/products/channels/threads/mm-t4805-3.e2e.ts` ← `MM-T4805_3 - should not display a thread a user started but not followed` (2m 18s, passed) _(close to budget: 2m 18s)_
  - `e2e/test/products/channels/threads/mm-t4805-4.e2e.ts` ← `MM-T4805_4 - should be able to go to a thread a user replied to and followed` (1m 47s, passed)
  - `e2e/test/products/channels/threads/mm-t4805-5.e2e.ts` ← `MM-T4805_5 - should not display a thread a user replied to but not followed` (1m 38s, passed)

### `e2e/test/products/channels/messaging/file_preview_gallery.e2e.ts`

- First-pass duration: **8m 25s** · status `passed` · 7 tests (6 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t3462.e2e.ts` ← `MM-T3462 - should render image preview for image file types` (1m 26s, passed)
  - `e2e/test/products/channels/messaging/mm-t3459-1.e2e.ts` ← `MM-T3459_1 - should dismiss file preview when user taps on close button` (1m 23s, passed)
  - `e2e/test/products/channels/messaging/mm-t3459-2.e2e.ts` ← `MM-T3459_2 - should dismiss file preview when user swipes down (iOS) or presses Back (Android)` (1m 30s, passed)
  - `e2e/test/products/channels/messaging/mm-t3463-1.e2e.ts` ← `MM-T3463_1 - should open file preview gallery for a video file attachment` (1m 31s, passed)
  - `e2e/test/products/channels/messaging/mm-t3458-1.e2e.ts` ← `MM-T3458_1 - should show gallery footer actions and copy public link when enabled` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/messaging/mm-t344-1.e2e.ts` ← `MM-T344_1 - should render image inline for a message with image attachment (message attachment)` (1m 9s, passed)
  - `e2e/test/products/channels/messaging/mm-t1806-1.e2e.ts` ← `MM-T1806_1 - should show share button for self-uploaded file in gallery preview` (1m 26s, passed)

### `e2e/test/products/channels/smoke_test/search.e2e.ts`

- First-pass duration: **8m 12s** · status `passed` · 4 tests (4 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/smoke_test/mm-t4911-1.e2e.ts` ← `MM-T4911_1 - should be able to display a recent mention on recent mentions screen` (1m 49s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4911-2.e2e.ts` ← `MM-T4911_2 - should be able to display a saved message on saved messages screen` (2m 10s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4911-3.e2e.ts` ← `MM-T4911_3 - should be able to display a pinned message on pinned messages screen` (1m 59s, passed)
  - `e2e/test/products/channels/smoke_test/mm-t4911-4.e2e.ts` ← `MM-T4911_4 - should be able to search for a message and display on search results screen` (2m 14s, passed)

### `e2e/test/products/channels/channel_settings/channel_members.e2e.ts`

- First-pass duration: **7m 49s** · status `passed` · 6 tests (4 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channel_settings/mm-t3195.e2e.ts` ← `MM-T3195 - RN apps Add members to channel` (1m 33s, passed)
  - `e2e/test/products/channels/channel_settings/mm-t856.e2e.ts` ← `MM-T856 - Add existing users to public channel from drop-down Add Members` (1m 42s, passed)
  - `e2e/test/products/channels/channel_settings/mm-t3196-1.e2e.ts` ← `MM-T3196_1 - RN apps Manage members in channel` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/channel_settings/mm-t3204.e2e.ts` ← `MM-T3204 - RN apps Add user to private channel` (1m 55s, passed)
  - `e2e/test/products/channels/channel_settings/mm-t3205.e2e.ts` ← `MM-T3205 - RN apps Remove user from private channel` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/channel_settings/mm-t878.e2e.ts` ← `MM-T878 - RN apps View Members in GM` (2m 39s, passed) _(close to budget: 2m 39s)_

### `e2e/test/products/channels/messaging/message_local_drafts.e2e.ts`

- First-pass duration: **7m 32s** · status `passed` · 6 tests (6 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t5637.e2e.ts` ← `MM-T5637 should be able to send the draft message from Draft screen` (1m 11s, passed)
  - `e2e/test/products/channels/messaging/mm-t5638.e2e.ts` ← `MM-T5638 should be able to swipe left and delete a draft message` (1m 3s, passed)
  - `e2e/test/products/channels/messaging/mm-t5638.e2e.ts` ← `MM-T5638 should be able to delete a draft message from long press Draft actions` (1m 9s, passed)
  - `e2e/test/products/channels/messaging/mm-t5636.e2e.ts` ← `MM-T5636 should be able to Edit a draft message` (1m 35s, passed)
  - `e2e/test/products/channels/messaging/mm-t5668.e2e.ts` ← `MM-T5668 should be able to verify drafts tab shows message priority "Important" and request acknowledgement` (1m 24s, passed)
  - `e2e/test/products/channels/messaging/mm-t5668.e2e.ts` ← `MM-T5668 should be able to verify drafts tab shows message priority "Urgent" and persistent notification` (1m 11s, passed)

### `e2e/test/products/channels/teams/invite_people.e2e.ts`

- First-pass duration: **7m 5s** · status `passed` · 6 tests (6 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/teams/mm-t5360.e2e.ts` ← `MM-T5360 - should open the invite screen` (1m 1s, passed)
  - `e2e/test/products/channels/teams/mm-t5361.e2e.ts` ← `MM-T5361 - should show no results item in search list` (1m 21s, passed)
  - `e2e/test/products/channels/teams/mm-t5362.e2e.ts` ← `MM-T5362 - should be able to send email invite` (1m 24s, passed)
  - `e2e/test/products/channels/teams/mm-t5363.e2e.ts` ← `MM-T5363 - should be able to send user invite` (1m 10s, passed)
  - `e2e/test/products/channels/teams/mm-t5364.e2e.ts` ← `MM-T5364 - should not be able to send user invite to user already in team` (1m 1s, passed)
  - `e2e/test/products/channels/teams/mm-t5365.e2e.ts` ← `MM-T5365 - should handle both sent and not sent invites` (1m 8s, passed)

### `e2e/test/products/channels/messaging/permalink.e2e.ts`

- First-pass duration: **6m 51s** · status `passed` · 4 tests (4 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t4876-1.e2e.ts` ← `MM-T4876_1 - should be able to jump to target public channel post by tapping on permalink with team name` (1m 40s, passed)
  - `e2e/test/products/channels/messaging/mm-t4876-2.e2e.ts` ← `MM-T4876_2 - should be able to jump to target public channel post by tapping on permalink with _redirect` (1m 43s, passed)
  - `e2e/test/products/channels/messaging/mm-t4876-3.e2e.ts` ← `MM-T4876_3 - should be able to jump to target DM post by tapping on permalink with team name` (1m 44s, passed)
  - `e2e/test/products/channels/messaging/mm-t4876-4.e2e.ts` ← `MM-T4876_4 - should be able to jump to target DM post by tapping on permalink with _redirect` (1m 44s, passed)

### `e2e/test/products/channels/channels/create_direct_message.e2e.ts`

- First-pass duration: **6m 44s** · status `passed` · 5 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4730-1.e2e.ts` ← `MM-T4730_1 - should match elements on create direct message screen` (1m 40s, passed)
  - `e2e/test/products/channels/channels/mm-t4730-2.e2e.ts` ← `MM-T4730_2 - should be able to create a direct message` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/channels/mm-t4730-3.e2e.ts` ← `MM-T4730_3 - should be able to create a group message` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/channels/mm-t4730-4.e2e.ts` ← `MM-T4730_4 - should display empty search state for create direct message` (1m 49s, passed)
  - `e2e/test/products/channels/channels/mm-t63374.e2e.ts` ← `MM-T63374 - should not display deactivated users in the create direct message screen` (3m 15s, passed) **⚠ single test already 3m 15s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/products/channels/messaging/emoji_display.e2e.ts`

- First-pass duration: **6m 31s** · status `passed` · 6 tests (6 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t160-1.e2e.ts` ← `MM-T160_1 - should display emoji-only messages as jumbo in main thread` (1m 22s, passed)
  - `e2e/test/products/channels/messaging/mm-t162-1.e2e.ts` ← `MM-T162_1 - should display emoji-only replies as jumbo in thread view` (1m 14s, passed)
  - `e2e/test/products/channels/messaging/mm-t4125-1.e2e.ts` ← `MM-T4125_1 - should render emojis on multiple lines correctly` (46s, passed)
  - `e2e/test/products/channels/messaging/mm-t198-1.e2e.ts` ← `MM-T198_1 - should treat emoji preceded by 4+ spaces as markdown code block (not jumbo)` (45s, passed)
  - `e2e/test/products/channels/messaging/mm-t167-1.e2e.ts` ← `MM-T167_1 - should render invalid emoji syntax as plain text` (1m 21s, passed)
  - `e2e/test/products/channels/messaging/mm-t151-1.e2e.ts` ← `MM-T151_1 - should show limited post options when long pressing a system message` (1m 3s, passed)

### `e2e/test/products/channels/messaging/message_edit.e2e.ts`

- First-pass duration: **6m 30s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t4783-1.e2e.ts` ← `MM-T4783_1 - should be able to edit a post message and save` (1m 58s, passed)
  - `e2e/test/products/channels/messaging/mm-t4783-2.e2e.ts` ← `MM-T4783_2 - should be able to edit a post message and cancel` (1m 55s, passed)
  - `e2e/test/products/channels/messaging/mm-t4783-3.e2e.ts` ← `MM-T4783_3 - should be able to edit a post message from reply thread` (2m 37s, passed) _(close to budget: 2m 37s)_

### `e2e/test/products/channels/server_login/server_list.e2e.ts`

- First-pass duration: **6m 30s** · status `passed` · 7 tests (4 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/server_login/mm-t4691-1.e2e.ts` ← `MM-T4691_1 - should match elements on server list screen` (43s, passed)
  - `e2e/test/products/channels/server_login/mm-t4691-2.e2e.ts` ← `MM-T4691_2 - should be able to add and log in to new servers` (3m 15s, passed) **⚠ single test already 3m 15s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/server_login/mm-t4691-3.e2e.ts` ← `MM-T4691_3 - should be able to switch to another existing server` (1m 21s, passed)
  - `e2e/test/products/channels/server_login/mm-t4691-4.e2e.ts` ← `MM-T4691_4 - should be able to edit server display name of active and inactive servers` (1m 11s, passed)
  - `e2e/test/products/channels/server_login/mm-t4691-5.e2e.ts` ← `MM-T4691_5 - should be able to remove a server from the list` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/server_login/mm-t4691-6.e2e.ts` ← `MM-T4691_6 - should be able to log out a server from the list` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/server_login/mm-t4691-7.e2e.ts` ← `MM-T4691_7 - should not be able to add server for an already existing server` (0s, skipped) _(skipped in this run — still split so it can run alone)_

### `e2e/test/products/channels/threads/open_thread_in_channel.e2e.ts`

- First-pass duration: **6m 25s** · status `passed` · 2 tests (2 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/threads/mm-t4810-1.e2e.ts` ← `MM-T4810_1 - should be able to open a thread in channel via thread options` (2m 47s, passed) _(close to budget: 2m 47s)_
  - `e2e/test/products/channels/threads/mm-t4810-2.e2e.ts` ← `MM-T4810_2 - should be able to open a thread in channel by permalink` (3m 38s, passed) **⚠ single test already 3m 38s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/products/channels/channels/favorite_and_unfavorite_channel.e2e.ts`

- First-pass duration: **6m 17s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4929-1.e2e.ts` ← `MM-T4929_1 - should be able to favorite/unfavorite a channel from channel quick actions` (1m 30s, passed)
  - `e2e/test/products/channels/channels/mm-t4929-2.e2e.ts` ← `MM-T4929_2 - should be able to favorite/unfavorite a channel from channel info screen` (1m 26s, passed)
  - `e2e/test/products/channels/channels/mm-t4929-3.e2e.ts` ← `MM-T4929_3 - should be able to favorite/unfavorite a direct message channel from channel intro` (3m 20s, passed) **⚠ single test already 3m 20s (>3m) — split alone is not enough; slim setup/waits**

### `e2e/test/products/channels/smoke_test/threads.e2e.ts`

- First-pass duration: **6m 7s** · status `passed` · 2 tests (2 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/smoke_test/mm-t4811-1.e2e.ts` ← `MM-T4811_1 - should be able to create a thread, follow/unfollow a thread, mark a thread as read/unread, and reply to thread` (3m 10s, passed) **⚠ single test already 3m 10s (>3m) — split alone is not enough; slim setup/waits**
  - `e2e/test/products/channels/smoke_test/mm-t4811-2.e2e.ts` ← `MM-T4811_2 - should be able to save/unsave a thread and open a thread in channel` (2m 57s, passed) _(close to budget: 2m 57s)_

### `e2e/test/products/channels/messaging/message_delete.e2e.ts`

- First-pass duration: **6m 6s** · status `passed` · 4 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t4784-1.e2e.ts` ← `MM-T4784_1 - should be able to delete a post message and confirm` (1m 49s, passed)
  - `e2e/test/products/channels/messaging/mm-t4784-2.e2e.ts` ← `MM-T4784_2 - should be able to delete a post message and cancel` (1m 54s, passed)
  - `e2e/test/products/channels/messaging/mm-t112.e2e.ts` ← `MM-T112 - should delete parent message and reply when parent is deleted from reply thread` (2m 23s, passed) _(close to budget: 2m 23s)_
  - `e2e/test/products/channels/messaging/mm-t4784-3.e2e.ts` ← `MM-T4784_3 - should be able to delete a post message from reply thread` (0s, skipped) _(skipped in this run — still split so it can run alone)_

### `e2e/test/products/channels/messaging/message_reply.e2e.ts`

- First-pass duration: **6m 6s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t4785-1.e2e.ts` ← `MM-T4785_1 - should be able to reply to a post via post options reply option` (2m 19s, passed) _(close to budget: 2m 19s)_
  - `e2e/test/products/channels/messaging/mm-t4785-2.e2e.ts` ← `MM-T4785_2 - should be able to open reply thread by tapping on the post` (1m 41s, passed)
  - `e2e/test/products/channels/messaging/mm-t4785-3.e2e.ts` ← `MM-T4785_3 - should not have reply option available on reply thread post options` (2m 6s, passed)

### `e2e/test/products/channels/channels/archive_channel.e2e.ts`

- First-pass duration: **6m** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4932-1.e2e.ts` ← `MM-T4932_1 - should be able to archive a public channel and confirm` (2m 23s, passed) _(close to budget: 2m 23s)_
  - `e2e/test/products/channels/channels/mm-t4932-2.e2e.ts` ← `MM-T4932_2 - should be able to archive a public channel and cancel` (1m 12s, passed)
  - `e2e/test/products/channels/channels/mm-t4932-3.e2e.ts` ← `MM-T4932_3 - should be able to archive a private channel and confirm` (2m 25s, passed) _(close to budget: 2m 25s)_

### `e2e/test/products/channels/messaging/message_post.e2e.ts`

- First-pass duration: **5m 46s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t4782-1.e2e.ts` ← `MM-T4782_1 - should be able to post a message when send button is tapped` (59s, passed)
  - `e2e/test/products/channels/messaging/mm-t4782-2.e2e.ts` ← `MM-T4782_2 - should be able to post a long message` (2m 8s, passed)
  - `e2e/test/products/channels/messaging/mm-t72.e2e.ts` ← `MM-T72 - should highlight @here. @all. @channel. even when followed by a period` (2m 39s, passed) _(close to budget: 2m 39s)_

### `e2e/test/products/channels/channels/edit_channel.e2e.ts`

- First-pass duration: **5m 44s** · status `passed` · 4 tests (4 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4906-1.e2e.ts` ← `MM-T4906_1 - should match elements on edit channel screen` (26s, passed)
  - `e2e/test/products/channels/channels/mm-t4906-2.e2e.ts` ← `MM-T4906_2 - should be able to edit public channel` (38s, passed)
  - `e2e/test/products/channels/channels/mm-t4906-3.e2e.ts` ← `MM-T4906_3 - should be able edit direct message channel` (2m 23s, passed) _(close to budget: 2m 23s)_
  - `e2e/test/products/channels/channels/mm-t4906-4.e2e.ts` ← `MM-T4906_4 - should be able edit group message channel` (2m 17s, passed) _(close to budget: 2m 17s)_

### `e2e/test/products/channels/messaging/emojis_and_reactions.e2e.ts`

- First-pass duration: **5m 37s** · status `passed` · 5 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t4862-1.e2e.ts` ← `MM-T4862_1 - should be able to view recent reactions and add new reaction via post options` (2m 21s, passed) _(close to budget: 2m 21s)_
  - `e2e/test/products/channels/messaging/mm-t4862-2.e2e.ts` ← `MM-T4862_2 - should be able to long press on a reaction to view the list of users who reacted` (2m 12s, passed)
  - `e2e/test/products/channels/messaging/mm-t4862-3.e2e.ts` ← `MM-T4862_3 - should be able to include emojis in a message and be able to find them in emoji bar and recently used section` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/messaging/mm-t4862-4.e2e.ts` ← `MM-T4862_4 - should display empty search state for emoji picker` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/messaging/mm-t146.e2e.ts` ← `MM-T146 - should be able to tap another user's emoji reaction to add the same reaction and then remove it` (1m 4s, passed)

### `e2e/test/products/channels/threads/reply_to_thread.e2e.ts`

- First-pass duration: **5m 33s** · status `passed` · 2 tests (2 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/threads/mm-t4809-1.e2e.ts` ← `MM-T4809_1 - should be able to reply to a thread via thread options` (2m 51s, passed) _(close to budget: 2m 51s)_
  - `e2e/test/products/channels/threads/mm-t4809-2.e2e.ts` ← `MM-T4809_2 - should be able to reply to a thread by opening thread` (2m 42s, passed) _(close to budget: 2m 42s)_

### `e2e/test/products/channels/threads/save_and_unsave_thread.e2e.ts`

- First-pass duration: **5m 23s** · status `passed` · 2 tests (2 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/threads/mm-t4808-1.e2e.ts` ← `MM-T4808_1 - should be able to save/unsave a thread via thread options` (2m 54s, passed) _(close to budget: 2m 54s)_
  - `e2e/test/products/channels/threads/mm-t4808-2.e2e.ts` ← `MM-T4808_2 - should be able to save/unsave a thread via thread overview` (2m 29s, passed) _(close to budget: 2m 29s)_

### `e2e/test/products/channels/threads/mark_thread_as_read_and_unread.e2e.ts`

- First-pass duration: **5m 17s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/threads/mm-t4807-1.e2e.ts` ← `MM-T4807_1 - should be able to mark a thread as read by opening thread` (1m 42s, passed)
  - `e2e/test/products/channels/threads/mm-t4807-2.e2e.ts` ← `MM-T4807_2 - should be able to mark a thread as read/unread via thread options` (2m, passed)
  - `e2e/test/products/channels/threads/mm-t4807-3.e2e.ts` ← `MM-T4807_3 - should be able to mark all threads as read` (1m 36s, passed)

### `e2e/test/products/channels/messaging/at_mention.e2e.ts`

- First-pass duration: **5m 13s** · status `passed` · 4 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t4874-1.e2e.ts` ← `MM-T4874_1 - should post at-mention as lowercase` (2m, passed)
  - `e2e/test/products/channels/messaging/mm-t4874-2.e2e.ts` ← `MM-T4874_2 - should display confirmation dialog when posting @all, @channel, and @here` (1m 39s, passed)
  - `e2e/test/products/channels/messaging/mm-t4874-3.e2e.ts` ← `MM-T4874_3 - should be able to open user profile by tapping on at-mention` (1m 35s, passed)
  - `e2e/test/products/channels/messaging/mm-t0171-1.e2e.ts` ← `MM-T0171_1 - should be able to autocomplete at-mention for out-of-channel member` (0s, skipped) _(skipped in this run — still split so it can run alone)_

### `e2e/test/products/channels/account/account_menu.e2e.ts`

- First-pass duration: **5m 8s** · status `passed` · 9 tests (9 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/account/mm-t4988-1.e2e.ts` ← `MM-T4988_1 - should match elements on account screen` (13s, passed)
  - `e2e/test/products/channels/account/mm-t4988-2.e2e.ts` ← `MM-T4988_2 - should be able to set user presence` (34s, passed)
  - `e2e/test/products/channels/account/mm-t3251.e2e.ts` ← `MM-T3251 - should be able to set status from account screen` (23s, passed)
  - `e2e/test/products/channels/account/mm-t4988-3.e2e.ts` ← `MM-T4988_3 - should be able to go to custom status screen` (12s, passed)
  - `e2e/test/products/channels/account/mm-t4988-4.e2e.ts` ← `MM-T4988_4 - should be able to go to edit profile screen` (13s, passed)
  - `e2e/test/products/channels/account/mm-t4988-5.e2e.ts` ← `MM-T4988_5 - should be able to go to settings screen` (12s, passed)
  - `e2e/test/products/channels/account/mm-t3472.e2e.ts` ← `MM-T3472 - should be able to add Nickname` (27s, passed)
  - `e2e/test/products/channels/account/mm-t3472.e2e.ts` ← `MM-T3472 - should show error when Username is updated with invalid characters` (26s, passed)
  - `e2e/test/products/channels/account/mm-t2056.e2e.ts` ← `MM-T2056 - Username changes when viewed by other user` (2m 29s, passed) _(close to budget: 2m 29s)_

### `e2e/test/products/channels/messaging/save_and_unsave_message.e2e.ts`

- First-pass duration: **5m 8s** · status `passed` · 2 tests (2 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t4864-1.e2e.ts` ← `MM-T4864_1 - should be able to save/unsave a message via post options on channel screen` (2m 10s, passed)
  - `e2e/test/products/channels/messaging/mm-t4864-2.e2e.ts` ← `MM-T4864_2 - should be able to save/unsave a message via post options on thread screen` (2m 57s, passed) _(close to budget: 2m 57s)_

### `e2e/test/products/channels/search/search_cycle.e2e.ts`

- First-pass duration: **5m 2s** · status `passed` · 3 tests (2 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/search/mm-t3235.e2e.ts` ← `MM-T3235 - should be able to search on text and jump to result in channel` (2m 47s, passed) _(close to budget: 2m 47s)_
  - `e2e/test/products/channels/search/mm-t373.e2e.ts` ← `MM-T373 - should be able to post a comment from search results` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/search/mm-t2507.e2e.ts` ← `MM-T2507 - should find DM channel by username, first name, last name, and nickname` (2m 14s, passed)

### `e2e/test/products/channels/channels/create_channel_and_edit_channel_header.e2e.ts`

- First-pass duration: **4m 57s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4731-1.e2e.ts` ← `MM-T4731_1 - should match elements on create channel screen` (1m 8s, passed)
  - `e2e/test/products/channels/channels/mm-t4731-2.e2e.ts` ← `MM-T4731_2 - should be able to create a public channel and edit the channel header` (1m 58s, passed)
  - `e2e/test/products/channels/channels/mm-t4731-3.e2e.ts` ← `MM-T4731_3 - should be able to create a private channel and edit the channel header` (1m 51s, passed)

### `e2e/test/products/channels/messaging/post_display_behavior.e2e.ts`

- First-pass duration: **4m 43s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/messaging/mm-t77-1.e2e.ts` ← `MM-T77_1 - should not repeat profile info for consecutive messages from same user` (1m 55s, passed)
  - `e2e/test/products/channels/messaging/mm-t216-1.e2e.ts` ← `MM-T216_1 - should scroll to bottom when sending a message after scrolling up` (1m 47s, passed)
  - `e2e/test/products/channels/messaging/mm-t3147-1.e2e.ts` ← `MM-T3147_1 - should scroll to bottom when a message is received while keyboard is open` (1m 1s, passed)

### `e2e/test/products/channels/account/account_profile_picture.e2e.ts`

- First-pass duration: **4m 38s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/account/mm-t288-1.e2e.ts` ← `MM-T288_1 - should navigate to profile picture picker and allow uploading from file` (1m 37s, passed)
  - `e2e/test/products/channels/account/mm-t289-1.e2e.ts` ← `MM-T289_1 - should show Remove Photo option when user has a custom profile picture` (1m 33s, passed)
  - `e2e/test/products/channels/account/mm-t290-1.e2e.ts` ← `MM-T290_1 - should show error when an invalid username is entered` (1m 29s, passed)

### `e2e/test/products/channels/channels/leave_channel.e2e.ts`

- First-pass duration: **4m 34s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4931-1.e2e.ts` ← `MM-T4931_1 - should be able to leave a channel from channel info screen and confirm` (1m 38s, passed)
  - `e2e/test/products/channels/channels/mm-t4931-2.e2e.ts` ← `MM-T4931_2 - should be able to leave a channel from channel info screen and cancel` (1m 24s, passed)
  - `e2e/test/products/channels/channels/mm-t4931-3.e2e.ts` ← `MM-T4931_3 - should be able to leave a channel from channel quick actions` (1m 31s, passed)

### `e2e/test/products/channels/channels/unarchive_channel.e2e.ts`

- First-pass duration: **4m 31s** · status `passed` · 2 tests (2 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/channels/mm-t4944-1.e2e.ts` ← `MM-T4944_1 - should be able to unarchive a public channel and confirm` (2m 10s, passed)
  - `e2e/test/products/channels/channels/mm-t4944-2.e2e.ts` ← `MM-T4944_2 - should be able to unarchive a private channel and confirm` (2m 21s, passed) _(close to budget: 2m 21s)_

### `e2e/test/ci_filter_failed/classification_banner_across_screens.e2e.ts`

- First-pass duration: **4m 16s** · status `failed` · 5 tests (5 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/ci_filter_failed/mm-t6209-1.e2e.ts` ← `MM-T6209_1 - should display the classification banner on the Recent Mentions screen` (42s, failed)
  - `e2e/test/ci_filter_failed/mm-t6210-1.e2e.ts` ← `MM-T6210_1 - should display the classification banner on the Saved Messages screen` (37s, failed)
  - `e2e/test/ci_filter_failed/mm-t6211-1.e2e.ts` ← `MM-T6211_1 - should display the classification banner on the Search screen` (37s, failed)
  - `e2e/test/ci_filter_failed/mm-t6212-1.e2e.ts` ← `MM-T6212_1 - should display the classification banner on the Account screen` (1m 6s, failed)
  - `e2e/test/ci_filter_failed/mm-t6213-1.e2e.ts` ← `MM-T6213_1 - should display the classification banner on the Thread screen` (1m 14s, failed)

### `e2e/test/products/channels/autocomplete/at_mention_user_filters.e2e.ts`

- First-pass duration: **4m 12s** · status `passed` · 3 tests (3 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/autocomplete/mm-t511-1.e2e.ts` ← `MM-T511_1 - should not show deactivated user in @ mention autocomplete` (58s, passed)
  - `e2e/test/products/channels/autocomplete/mm-t2349-1.e2e.ts` ← `MM-T2349_1 - should match user by nickname in @ autocomplete` (1m 5s, passed)
  - `e2e/test/products/channels/autocomplete/mm-t132-1.e2e.ts` ← `MM-T132_1 - should show autocomplete independently in each channel draft` (2m 9s, passed)

### `e2e/test/products/channels/search/recent_mentions.e2e.ts`

- First-pass duration: **4m 7s** · status `passed` · 4 tests (2 non-skipped)
- On disk: `yes`
- Proposed files:

  - `e2e/test/products/channels/search/mm-t4909-2.e2e.ts` ← `MM-T4909_2 - should be able to display a recent mention in recent mentions screen and navigate to message channel` (1m 9s, passed)
  - `e2e/test/products/channels/search/mm-t4909-4.e2e.ts` ← `MM-T4909_4 - should be able to save/unsave a recent mention from recent mentions screen` (0s, skipped) _(skipped in this run — still split so it can run alone)_
  - `e2e/test/products/channels/search/mm-t4909-5.e2e.ts` ← `MM-T4909_5 - should be able to pin/unpin a recent mention from recent mentions screen` (2m 58s, passed) _(close to budget: 2m 58s)_
  - `e2e/test/products/channels/search/mm-t4909-3.e2e.ts` ← `MM-T4909_3 - should be able to edit, reply to, and delete a recent mention from recent mentions screen` (0s, skipped) _(skipped in this run — still split so it can run alone)_

## Individual tests >3m (inside any >4m suite)

Even after 1:1 file splits, these will still miss the 3m target unless sped up.

| Test duration | Status | Spec | Test |
|---------------|--------|------|------|
| 5m 13s | failed | `e2e/test/ci_filter_failed/global_classification_banner.e2e.ts` | MM-T6205_1 - should not render the banner on the channel screen when classification is removed while on channel list |
| 4m 55s | failed | `e2e/test/ci_filter_failed/global_classification_banner.e2e.ts` | MM-T6199_1 - should render the banner on the global threads screen when classification is configured |
| 4m 41s | passed | `e2e/test/ci_filter_failed/global_classification_banner.e2e.ts` | MM-T6197_1 - should render the banner on the channel list screen when classification is configured |
| 4m 34s | passed | `e2e/test/products/channels/messaging/file_upload.e2e.ts` | MM-T339_1 - should show an error when the server max file size is set to a very small value |
| 4m 15s | passed | `e2e/test/products/channels/account/custom_status.e2e.ts` | MM-T4091 - should be able to set custom status with expiry time and verify in various locations |
| 3m 49s | passed | `e2e/test/products/channels/messaging/message_permalink.e2e.ts` | MM-T4877_7 - should handle permalink preview when original post is deleted |
| 3m 38s | passed | `e2e/test/products/channels/threads/open_thread_in_channel.e2e.ts` | MM-T4810_2 - should be able to open a thread in channel by permalink |
| 3m 38s | passed | `e2e/test/products/channels/channels/archive_channel_from_settings.e2e.ts` | MM-T1703_1 - should be able to open archived channels and verify read-only state |
| 3m 35s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4203 should handle different text input subtypes (Plugin) |
| 3m 33s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4983 should handle field refresh basic interaction (Plugin) |
| 3m 33s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T2530D should display relative date defaults |
| 3m 33s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T2530F should verify UTC conversion for datetime values |
| 3m 32s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T2530A should open date/datetime dialog and display fields |
| 3m 32s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T2530G should display timezone indicator and convert to UTC correctly |
| 3m 31s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4103 should fill text field and submit dialog (Plugin) |
| 3m 31s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4976 should handle multiselect fields dialog (Plugin) |
| 3m 31s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4981 should handle multistep dialog cancellation (Plugin) |
| 3m 31s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4104 should handle server error on dialog submission (Plugin) |
| 3m 31s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4986 should handle field refresh changes and cancellation (Plugin) |
| 3m 30s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4101 should open simple interactive dialog (Plugin) |
| 3m 30s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T2530B should validate required date/datetime fields |
| 3m 30s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4977 should handle dynamic select fields dialog (Plugin) |
| 3m 30s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4401 should toggle boolean fields and submit (Plugin) |
| 3m 29s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T2530H should accept manual time entry on datetime field |
| 3m 29s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T2530C should select date and display formatted value |
| 3m 28s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4980 should complete multistep dialog progression (Plugin) |
| 3m 28s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4402 should handle boolean field validation (Plugin) |
| 3m 28s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4102 should submit simple interactive dialog (Plugin) |
| 3m 28s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4498 should open and handle interactive dialog with select fields (Plugin) |
| 3m 27s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4499 should handle required select field validation (Plugin) |
| 3m 27s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4500 should handle different selector types (Plugin) |
| 3m 27s | failed | `e2e/test/products/channels/interactive_dialog/interactive_dialog_plugin.e2e.ts` | MM-T4202 should validate required text field (Plugin) |
| 3m 22s | passed | `e2e/test/products/channels/search/hashtag_search.e2e.ts` | MM-T361_1 - should be able to tap a hashtag in Saved Messages to trigger a hashtag search |
| 3m 21s | passed | `e2e/test/products/channels/smoke_test/channels.e2e.ts` | MM-T4774_2 - should be able to create a channel and create a direct message |
| 3m 20s | passed | `e2e/test/products/channels/channels/favorite_and_unfavorite_channel.e2e.ts` | MM-T4929_3 - should be able to favorite/unfavorite a direct message channel from channel intro |
| 3m 17s | passed | `e2e/test/products/channels/threads/follow_and_unfollow_thread.e2e.ts` | MM-T4806_3 - should be able to follow/unfollow a thread via post options |
| 3m 16s | passed | `e2e/test/products/channels/search/search_results.e2e.ts` | MM-T372_1 - highlighting does not persist in Saved Messages |
| 3m 15s | passed | `e2e/test/products/channels/server_login/server_list.e2e.ts` | MM-T4691_2 - should be able to add and log in to new servers |
| 3m 15s | passed | `e2e/test/products/channels/channels/create_direct_message.e2e.ts` | MM-T63374 - should not display deactivated users in the create direct message screen |
| 3m 10s | passed | `e2e/test/products/channels/smoke_test/threads.e2e.ts` | MM-T4811_1 - should be able to create a thread, follow/unfollow a thread, mark a thread as read/unread, and reply to thread |
| 3m 9s | passed | `e2e/test/ci_filter_failed/global_classification_banner.e2e.ts` | MM-T6203_1 - should remove the banner when classification configuration is deleted |
| 3m 7s | passed | `e2e/test/products/channels/search/search_recents.e2e.ts` | MM-T3238_1 - delete one previous search, tap on another |
| 3m 4s | passed | `e2e/test/products/channels/search/search_recents.e2e.ts` | MM-T355_1 - old results not combined with new results |
| 3m 1s | failed | `e2e/test/ci_filter_failed/global_classification_banner.e2e.ts` | MM-T6204_1 - should remove the banner when the feature flag is toggled off |

## Suggested review order

1. Canonical `products/**` multi-test files with many short tests (quick wins by splitting).
2. Files with individual tests already >3m (classification banner, interactive dialog, file_upload MM-T339, etc.).
3. Drop or stop maintaining `ci_filter_failed/**` duplicates once products sources are split.
4. After splits: re-run Detox iOS orchestration and confirm UI durations ≤3m.

## Out of scope for this plan doc

- Actually moving/creating files (wait for review approval).
- Android durations (iOS report only).
- Changing orchestration lease/retest policy (handled separately).
