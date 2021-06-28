// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Emoji, CustomEmoji} from '@mm-redux/types/emojis';

export function isCustomEmoji(emoji: Emoji): emoji is CustomEmoji {
    return 'id' in emoji;
}

export function parseNeededCustomEmojisFromText(text: string, customEmojisByName: Map<string, CustomEmoji>, nonExistentEmoji: Set<string>): Set<string> {
    if (!text.includes(':')) {
        return new Set();
    }

    const pattern = /:([A-Za-z0-9_-]+):/gi;
    const customEmojis = new Set<string>();
    let match;
    while ((match = pattern.exec(text)) !== null) {
        if (!match) {
            continue;
        }

        if (nonExistentEmoji.has(match[1])) {
            // We've previously confirmed this is not a custom emoji
            continue;
        }

        if (customEmojisByName.has(match[1])) {
            // We have the emoji, go to the next match
            continue;
        }

        customEmojis.add(match[1]);
    }

    return customEmojis;
}
