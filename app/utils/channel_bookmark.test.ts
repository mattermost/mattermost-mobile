// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BOOKMARK_DISPLAY_NAME_MAX_LENGTH, limitBookmarkDisplayName} from './channel_bookmark';

describe('limitBookmarkDisplayName', () => {
    it('keeps a name within the limit as is', () => {
        expect(limitBookmarkDisplayName('Mattermost')).toBe('Mattermost');
        const exact = 'a'.repeat(BOOKMARK_DISPLAY_NAME_MAX_LENGTH);
        expect(limitBookmarkDisplayName(exact)).toBe(exact);
    });

    it('cuts a page title longer than the server allows', () => {
        // mattermost.com's title, 93 characters; saving it failed with "Could not save bookmark."
        const title = 'Mattermost | Operational and AI Sovereignty for Critical Infrastructure and National Security';
        const limited = limitBookmarkDisplayName(title);
        expect(limited).toBe(title.slice(0, BOOKMARK_DISPLAY_NAME_MAX_LENGTH));
        expect(limited).toHaveLength(BOOKMARK_DISPLAY_NAME_MAX_LENGTH);
    });

    it('counts characters as the server does and never splits one', () => {
        const name = '😀'.repeat(BOOKMARK_DISPLAY_NAME_MAX_LENGTH + 1);
        const limited = limitBookmarkDisplayName(name);
        expect(Array.from(limited)).toHaveLength(BOOKMARK_DISPLAY_NAME_MAX_LENGTH);
        expect(limited).toBe('😀'.repeat(BOOKMARK_DISPLAY_NAME_MAX_LENGTH));
        expect(limitBookmarkDisplayName('😀'.repeat(BOOKMARK_DISPLAY_NAME_MAX_LENGTH))).toBe('😀'.repeat(BOOKMARK_DISPLAY_NAME_MAX_LENGTH));
    });
});
