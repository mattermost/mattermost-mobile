# Translation String Rename Plan - Two Phases

## Phase 1: "Checklist" → "Section" (excluding "checklist item" and "channel checklist")

After thorough analysis, **NO changes needed** for Phase 1.

**Reason:** All occurrences of "checklist" in translation strings are either:
- Part of "channel checklist" (exception - keep unchanged)
- Part of "checklist item" references (exception - keep unchanged)
- In variable/function names (not in translation strings)

---

## Phase 2: "Run" (noun) → "Checklist" (excluding verb usage)

### Progress: 14/14 Files Complete ✅

### File 1: `app/products/playbooks/screens/playbook_run/playbook_run.tsx`
Changes:
- Line 56: `'Run Participants'` → `'Checklist Participants'`
- Line 60: `'Run details'` → `'Checklist details'`
- Line 72: `'Finish Run'` → `'Finish Checklist'`
- Line 80: `'finish the run for all participants'` → `'finish the checklist for all participants'`
- Line 96: `'Finish Run'` → `'Finish Checklist'`

### File 2: `app/products/playbooks/screens/select_playbook/playbook_row.tsx`
Changes:
- Line 73: `'No runs in progress'` → `'No checklists in progress'`
- Line 78: `'{count} {count, plural, one {run} other {runs}} in progress'` → `'{count} {count, plural, one {checklist} other {checklists}} in progress'`

### File 3: `app/products/playbooks/screens/playbooks_runs/empty_state.tsx`
Changes:
- Line 43: `'No in progress runs'` → `'No in progress checklists'`
- Line 47: `'No finished runs'` → `'No finished checklists'`
- Line 51: `'When a run starts in this channel'` → `'When a checklist starts in this channel'`
- Line 55: `'When a run in this channel finishes'` → `'When a checklist in this channel finishes'`

### File 4: `app/products/playbooks/screens/post_update/post_update.tsx`
Changes:
- Line 215: `'Are you sure you want to finish the run {runName} for all participants?'` → `'Are you sure you want to finish the checklist {runName} for all participants?'`
- Line 217: `'There {outstanding, plural, =1 {is # outstanding task} other {are # outstanding tasks}}. Are you sure you want to finish the run {runName} for all participants?'` → `'There {outstanding, plural, =1 {is # outstanding task} other {are # outstanding tasks}}. Are you sure you want to finish the checklist {runName} for all participants?'`
- Line 220: `'Confirm finish run'` → `'Confirm finish checklist'`
- Line 228: `'Finish run'` → `'Finish checklist'`
- Line 268: `'This update for the run <Bold>{runName}</Bold>'` → `'This update for the checklist <Bold>{runName}</Bold>'`
- Line 293: `'Also mark the run as finished'` → `'Also mark the checklist as finished'`

### File 5: `app/products/playbooks/screens/navigation.ts`
Changes:
- Line 17: `'Playbook runs'` → `'Playbook checklists'`
- Line 29: `'Playbook runs'` → `'Playbook checklists'`
- Line 34: `'Playbook run'` → `'Playbook checklist'`
- Line 50: `'Playbook run'` → `'Playbook checklist'`
- Line 124: `'Start a run'` → `'Start a checklist'`
- Line 136: `'Start a run'` → `'Start a checklist'`

### File 6: `app/products/playbooks/screens/start_a_run/start_a_run.tsx`
Changes:
- Line 189: `'Run name'` → `'Checklist name'`
- Line 193: `'Add a name for your run'` → `'Add a name for your checklist'`
- Line 201: `'Please add a name for this run'` → `'Please add a name for this checklist'`
- Line 207: `'Run description'` → `'Checklist description'`

### File 7: `app/products/playbooks/screens/playbook_run/status_update_indicator.tsx`
Changes:
- Line 71: `'Run finished {time}'` → `'Checklist finished {time}'`

### File 8: `app/products/playbooks/screens/playbooks_runs/playbook_runs.tsx`
Changes:
- Line 162: `'Start a new run'` → `'Start a new checklist'`

### File 9: `app/products/playbooks/screens/playbook_run/error_state.tsx`
Changes:
- Line 41: `'Unable to fetch run details'` → `'Unable to fetch checklist details'`

### File 10: `app/products/playbooks/screens/participant_playbooks/participant_playbooks.tsx`
Changes:
- Line 63: `'Some playbook runs or updates may be missing from this list.'` → `'Some playbook checklists or updates may be missing from this list.'`

### File 11: `app/products/playbooks/screens/playbooks_runs/playbook_card/playbook_card.tsx`
Changes:
- Line 81: `'Run Participants'` → `'Checklist Participants'`

### File 12: `app/products/playbooks/screens/navigation.test.ts`
Changes:
- Line 36: `'Playbook runs'` → `'Playbook checklists'`
- Line 62: `'Playbook run'` → `'Playbook checklist'`
- Line 199: `'Playbook runs'` → `'Playbook checklists'`
- Line 233: `'Playbook run'` → `'Playbook checklist'`

### File 13: `app/products/playbooks/screens/playbook_run/playbook_run.test.tsx`
Changes:
- Line 193: `'Run Participants'` → `'Checklist Participants'`

### File 14: `app/products/playbooks/screens/playbooks_runs/playbook_card/playbook_card.test.tsx`
Changes:
- Line 70: `'Run Participants'` → `'Checklist Participants'`

---

## Exceptions (Keep Unchanged)

The following strings contain "run" as a **verb** and should NOT be changed:
- "Run command" (in checklist_item_bottom_sheet.tsx)
- "Rerun command" (in checklist_item_bottom_sheet.tsx)
- "{command} (Rerun)" (in checklist_item.tsx)

---

## Important Notes

1. **Preserve capitalization**: "Run" → "Checklist", "run" → "checklist", "runs" → "checklists"
2. **Variable names unchanged**: All variable names remain as-is (e.g., `runName`, `playbookRun`)
3. **Translation IDs unchanged**: All i18n keys remain unchanged (e.g., `playbooks.playbook_run.title`)
4. **Only update defaultMessage strings**: Do not modify the `id` fields

---

## Summary

- **Phase 1:** 0 changes (no standalone "checklist" found) ✅
- **Phase 2:** 40 translation strings across 14 files ✅ COMPLETE
- **Total changes made:** 40 strings

All translation string updates have been completed successfully!
