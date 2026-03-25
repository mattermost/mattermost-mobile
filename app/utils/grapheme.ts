// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import GraphemeSplitter from 'grapheme-splitter';

/**
 * Deletes the last grapheme cluster (character) from a string before the cursor position.
 * Handles complex Unicode characters like emojis, flags, and modifiers correctly.
 *
 * @param text - The text to delete from
 * @param cursorPosition - The cursor position (0-based index)
 * @returns Object with updated text and new cursor position
 */
export function deleteLastGrapheme(text: string, cursorPosition: number): {
    text: string;
    cursorPosition: number;
} {
    if (cursorPosition === 0) {
        return {text, cursorPosition: 0};
    }

    const adjustedCursorPosition = cursorPosition > text.length ? text.length : cursorPosition;
    const splitter = new GraphemeSplitter();
    const textBeforeCursor = text.slice(0, adjustedCursorPosition);
    const clusters = splitter.splitGraphemes(textBeforeCursor);

    if (clusters.length === 0) {
        return {text, cursorPosition};
    }

    // Remove last grapheme cluster
    clusters.pop();

    const joinedClusters = clusters.join('');
    const updatedText = joinedClusters + text.slice(adjustedCursorPosition);
    const newCursorPosition = joinedClusters.length;

    return {
        text: updatedText,
        cursorPosition: newCursorPosition,
    };
}

