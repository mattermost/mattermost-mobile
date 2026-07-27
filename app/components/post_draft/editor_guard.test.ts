// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    buildEditorKey,
    captureEditorGeneration,
    clearEditor,
    invalidateEditor,
    isEditorGenerationStale,
    markEditorEdited,
    markEditorSaved,
    resetEditorBaseline,
    shouldSaveEditor,
} from './editor_guard';

describe('editor_guard', () => {
    const serverUrl = 'https://server.com';
    const channelId = 'channel-id';
    const rootId = '';

    let key: string;

    beforeEach(() => {
        key = buildEditorKey(serverUrl, channelId, rootId);

        // Ensure a fresh entry for each test.
        clearEditor(key);
    });

    it('should build a composite key from serverUrl, channelId and rootId', () => {
        expect(buildEditorKey('a', 'b', 'c')).toBe('a:b:c');
    });

    it('should default to clean, non-stale state on first access', () => {
        expect(shouldSaveEditor(key)).toBe(false);
        expect(captureEditorGeneration(key)).toBe(0);
    });

    it('should make shouldSaveEditor true after a genuine edit', () => {
        markEditorEdited(key);
        expect(shouldSaveEditor(key)).toBe(true);
    });

    it('should clear dirty flag and set baseline after markEditorSaved', () => {
        markEditorEdited(key);
        markEditorSaved(key, 'saved value');
        expect(shouldSaveEditor(key)).toBe(false);
    });

    it('should clear dirty flag without signalling an edit on resetEditorBaseline', () => {
        markEditorEdited(key);
        resetEditorBaseline(key, 'external value');
        expect(shouldSaveEditor(key)).toBe(false);
    });

    it('should bump generation and clear dirty flag on invalidateEditor', () => {
        markEditorEdited(key);
        const before = captureEditorGeneration(key);

        invalidateEditor(key);

        expect(captureEditorGeneration(key)).toBe(before + 1);

        // Resurrection guard: a subsequent lifecycle save must be a no-op.
        expect(shouldSaveEditor(key)).toBe(false);
    });

    it('should make a captured generation stale after invalidateEditor', () => {
        const captured = captureEditorGeneration(key);
        expect(isEditorGenerationStale(key, captured)).toBe(false);

        invalidateEditor(key);

        expect(isEditorGenerationStale(key, captured)).toBe(true);
    });

    it('should treat a captured generation as stale when the key is absent', () => {
        const captured = captureEditorGeneration(key);
        clearEditor(key);
        expect(isEditorGenerationStale(key, captured)).toBe(true);
    });

    it('should remove state on clearEditor so a fresh entry is created afterwards', () => {
        markEditorEdited(key);
        invalidateEditor(key);
        expect(captureEditorGeneration(key)).toBe(1);

        clearEditor(key);

        // Fresh entry: generation reset to 0, clean.
        expect(captureEditorGeneration(key)).toBe(0);
        expect(shouldSaveEditor(key)).toBe(false);
    });

    it('should keep distinct keys independent', () => {
        const otherKey = buildEditorKey(serverUrl, 'other-channel', rootId);
        clearEditor(otherKey);

        markEditorEdited(key);
        invalidateEditor(key);

        expect(shouldSaveEditor(otherKey)).toBe(false);
        expect(captureEditorGeneration(otherKey)).toBe(0);

        markEditorEdited(otherKey);
        expect(shouldSaveEditor(otherKey)).toBe(true);
        expect(shouldSaveEditor(key)).toBe(false);

        clearEditor(otherKey);
    });
});
