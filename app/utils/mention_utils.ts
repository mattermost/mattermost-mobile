// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface MentionRange {
    readonly start: number;
    readonly end: number;
    readonly text: string;
}

export interface CursorPositionInfo {
    readonly inArea: boolean;
    readonly range?: MentionRange;
    readonly position?: number;
}

export interface MentionDeletionResult {
    readonly shouldDelete: boolean;
    readonly newPosition?: number;
    readonly newText?: string;
}

export interface MentionInvasionResult {
    readonly willInvade: boolean;
    readonly safePosition?: number;
}

// Cached regular expression for mention detection (performance optimization)
const MENTION_REGEX = /@([a-z0-9.\-_]+)/gi;

/**
 * Detects and returns mention ranges in text
 * @param text - The text to search for mentions
 * @returns Array of mention ranges
 */
export function getMentionRanges(text: string): MentionRange[] {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const ranges: MentionRange[] = [];
    // Reset regex lastIndex to ensure proper execution
    MENTION_REGEX.lastIndex = 0;
    let match;

    while ((match = MENTION_REGEX.exec(text)) !== null) {
        ranges.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
        });
    }

    return ranges;
}

/**
 * Checks if cursor position is within a mention area
 * @param text - The text to check
 * @param cursorPosition - Current cursor position
 * @returns Detailed cursor position information
 */
export function getCursorPositionInfo(text: string, cursorPosition: number): CursorPositionInfo {
    if (!text || typeof text !== 'string' || cursorPosition < 0) {
        return {inArea: false};
    }

    const mentionRanges = getMentionRanges(text);

    for (const range of mentionRanges) {
        // Check if cursor is within mention area (inclusive start, exclusive end)
        if (cursorPosition >= range.start && cursorPosition < range.end) {
            return {
                inArea: true,
                range,
                position: cursorPosition,
            };
        }
    }

    return {inArea: false};
}

/**
 * Calculates safe cursor position avoiding mention areas
 * @param text - Target text
 * @param targetPosition - Target cursor position
 * @returns Safe cursor position
 */
export function getSafeCursorPosition(text: string, targetPosition: number): number {
    if (!text || typeof text !== 'string' || targetPosition < 0) {
        return 0;
    }

    const mentionRanges = getMentionRanges(text);
    let newPosition = targetPosition;

    for (const range of mentionRanges) {
        // If targetPosition is within mention area, move to end of mention
        if (targetPosition >= range.start && targetPosition < range.end) {
            newPosition = range.end;
            break;
        }
    }

    // Ensure cursor position doesn't exceed text length
    return Math.max(0, Math.min(newPosition, text.length));
}

/**
 * Calculates display cursor position based on mention replacements
 * @param text - Original text with mentions
 * @param cursorPosition - Cursor position in original text
 * @param mentionReplacements - Array of mention replacements with display names
 * @returns Adjusted cursor position for display
 */
export function getDisplayCursorPosition(
    text: string,
    cursorPosition: number,
    mentionReplacements: Array<{
        start: number;
        end: number;
        originalText: string;
        displayText: string;
    }>
): number {
    if (!text || mentionReplacements.length === 0) {
        return cursorPosition;
    }

    let displayPosition = cursorPosition;
    let offset = 0;

    for (const replacement of mentionReplacements) {
        // If cursor is before this mention, apply accumulated offset
        if (cursorPosition <= replacement.start) {
            break;
        }

        // If cursor is within mention, move to end of display text
        if (cursorPosition >= replacement.start && cursorPosition <= replacement.end) {
            const lengthDiff = replacement.displayText.length - replacement.originalText.length;
            displayPosition = replacement.start + replacement.displayText.length + offset;
            break;
        }

        // If cursor is after mention, accumulate offset
        if (cursorPosition > replacement.end) {
            const lengthDiff = replacement.displayText.length - replacement.originalText.length;
            offset += lengthDiff;
        }
    }

    return displayPosition + offset;
}

/**
 * Calculates original cursor position from display cursor position
 * @param text - Original text with mentions
 * @param displayCursorPosition - Cursor position in display text
 * @param mentionReplacements - Array of mention replacements with display names
 * @returns Original cursor position
 */
export function getOriginalCursorPosition(
    text: string,
    displayCursorPosition: number,
    mentionReplacements: Array<{
        start: number;
        end: number;
        originalText: string;
        displayText: string;
    }>
): number {
    if (!text || mentionReplacements.length === 0) {
        return displayCursorPosition;
    }

    let originalPosition = displayCursorPosition;
    let displayOffset = 0;

    for (const replacement of mentionReplacements) {
        const displayStart = replacement.start + displayOffset;
        const displayEnd = displayStart + replacement.displayText.length;

        // If display cursor is before this mention
        if (displayCursorPosition <= displayStart) {
            break;
        }

        // If display cursor is within mention display text
        if (displayCursorPosition >= displayStart && displayCursorPosition <= displayEnd) {
            originalPosition = replacement.end;
            break;
        }

        // If display cursor is after mention, subtract the length difference
        if (displayCursorPosition > displayEnd) {
            const lengthDiff = replacement.displayText.length - replacement.originalText.length;
            originalPosition -= lengthDiff;
            displayOffset += lengthDiff;
        }
    }

    return Math.max(0, Math.min(originalPosition, text.length));
}

/**
 * Checks if key input will invade mention areas
 * @param text - Target text
 * @param currentPosition - Current cursor position
 * @param key - Pressed key
 * @returns Invasion result and safe position
 */
export function willInvadeMentionArea(
    text: string,
    currentPosition: number,
    key: string,
): MentionInvasionResult {
    if (!text || typeof text !== 'string' || currentPosition < 0) {
        return {willInvade: false};
    }

    const mentionRanges = getMentionRanges(text);

    // If no mentions found, allow normal processing
    if (mentionRanges.length === 0) {
        return {willInvade: false};
    }

    // Handle regular arrow key navigation
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
        const nextPosition = key === 'ArrowLeft' ? currentPosition - 1 : currentPosition + 1;

        for (const range of mentionRanges) {
            // Right arrow invading mention start position
            if (key === 'ArrowRight' && currentPosition < range.start && nextPosition >= range.start) {
                return {willInvade: true, safePosition: range.start};
            }
            // Left arrow invading mention area
            if (key === 'ArrowLeft') {
                if (currentPosition > range.end && nextPosition < range.end && nextPosition >= range.start) {
                    return {willInvade: true, safePosition: range.end};
                }
                if (currentPosition === range.end && nextPosition === range.end - 1) {
                    return {willInvade: true, safePosition: range.end};
                }
            }
        }
    }

    return {willInvade: false};
}

/**
 * Handles mention deletion logic
 * @param text - Target text
 * @param cursorPosition - Current cursor position
 * @param key - Delete key ('Backspace' | 'Delete')
 * @returns Deletion processing result
 */
export function handleMentionDeletion(
    text: string,
    cursorPosition: number,
    key: 'Backspace' | 'Delete',
): MentionDeletionResult {
    if (!text || typeof text !== 'string' || cursorPosition < 0) {
        return {shouldDelete: false};
    }

    const mentionRanges = getMentionRanges(text);

    for (const range of mentionRanges) {
        if (key === 'Backspace' && cursorPosition === range.end) {
            // Backspace right after mention → delete entire mention
            const newText = text.substring(0, range.start) + text.substring(range.end);
            return {
                shouldDelete: true,
                newPosition: range.start,
                newText,
            };
        }

        if (key === 'Delete' && cursorPosition >= range.start && cursorPosition < range.end) {
            // Delete within mention → move to mention end
            return {
                shouldDelete: false,
                newPosition: range.end,
            };
        }
    }

    return {shouldDelete: false};
}
