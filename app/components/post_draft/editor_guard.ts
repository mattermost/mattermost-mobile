// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Per-composer race guard registry.
//
// Local Draft edits/deletes are routed through a durable outbox. Once a Send or
// Delete clears the draft, a still-pending blur / app-background / unmount save
// can re-run a draft update with stale editor text, resurrecting the draft and
// coalescing an upsert over the durable DELETE. This module tracks, per composer
// key, whether the editor holds a genuine unsaved user edit and a monotonically
// increasing generation that Send/Delete bump so late lifecycle saves become
// no-ops (both via `shouldSaveEditor` and via the captured-generation staleness
// check).

type EditorGuardState = {

    // Bumped on every Send/Delete. Lifecycle saves capture the generation before
    // the async write and discard their result if it changed in the meantime.
    generation: number;

    // True only after a genuine user keystroke; cleared once saved or when an
    // external/remote value change updates the baseline.
    hasUnsavedEdit: boolean;

    // Last value known to be persisted (or externally provided). Kept for
    // completeness/debugging and to reason about clean-vs-dirty state.
    baseline: string;
};

const registry = new Map<string, EditorGuardState>();

/**
 * Build the registry key shared by the save site and the invalidation sites.
 */
export function buildEditorKey(serverUrl: string, channelId: string, rootId: string): string {
    return `${serverUrl}:${channelId}:${rootId}`;
}

/**
 * Lazily create (generation:0, hasUnsavedEdit:false, baseline:'') and return the
 * state for a key.
 */
function getOrCreate(key: string): EditorGuardState {
    let state = registry.get(key);
    if (!state) {
        state = {generation: 0, hasUnsavedEdit: false, baseline: ''};
        registry.set(key, state);
    }
    return state;
}

/**
 * Mark the editor dirty in response to a genuine user edit.
 */
export function markEditorEdited(key: string): void {
    getOrCreate(key).hasUnsavedEdit = true;
}

/**
 * Record a successful save: clear the dirty flag and advance the baseline.
 */
export function markEditorSaved(key: string, value: string): void {
    const state = getOrCreate(key);
    state.hasUnsavedEdit = false;
    state.baseline = value;
}

/**
 * Update the baseline from an EXTERNAL/remote value change (channel switch,
 * clearDraft, remote update). Marks the editor clean but does NOT signal a
 * user edit, so a later untouched blur/unmount will not resave stale text.
 */
export function resetEditorBaseline(key: string, value: string): void {
    const state = getOrCreate(key);
    state.hasUnsavedEdit = false;
    state.baseline = value;
}

/**
 * Invalidate the editor on Send/Delete: bump the generation (so captured
 * generations become stale) and clear the dirty flag (so a subsequent lifecycle
 * save is a no-op and cannot resurrect the draft).
 */
export function invalidateEditor(key: string): void {
    const state = getOrCreate(key);
    state.generation += 1;
    state.hasUnsavedEdit = false;
}

/**
 * Whether a lifecycle save should proceed (true only when there is a genuine
 * unsaved user edit).
 */
export function shouldSaveEditor(key: string): boolean {
    return getOrCreate(key).hasUnsavedEdit;
}

/**
 * Capture the current generation for a later staleness check.
 */
export function captureEditorGeneration(key: string): number {
    return getOrCreate(key).generation;
}

/**
 * Whether the generation changed since it was captured (or the key is absent).
 */
export function isEditorGenerationStale(key: string, captured: number): boolean {
    const state = registry.get(key);
    if (!state) {
        return true;
    }
    return state.generation !== captured;
}

/**
 * Remove the entry entirely (call on unmount). A subsequent access lazily
 * recreates a fresh entry.
 */
export function clearEditor(key: string): void {
    registry.delete(key);
}
