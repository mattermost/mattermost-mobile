// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// The server rejects a bookmark whose display name is longer than this many
// characters (model.DisplayNameMaxRunes), with only a generic "Could not save bookmark."
export const BOOKMARK_DISPLAY_NAME_MAX_LENGTH = 64;

/**
 * A display name the server accepts. Names are filled in from a page title or a
 * file name, either of which can be longer than the server allows. Counts code
 * points, as the server does, so an emoji or other character outside the BMP is
 * never split.
 */
export function limitBookmarkDisplayName(name: string): string {
    const chars = Array.from(name);
    if (chars.length <= BOOKMARK_DISPLAY_NAME_MAX_LENGTH) {
        return name;
    }
    return chars.slice(0, BOOKMARK_DISPLAY_NAME_MAX_LENGTH).join('');
}
