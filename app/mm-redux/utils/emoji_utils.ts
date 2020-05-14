// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@mm-redux/client';
import {Emoji, SystemEmoji, CustomEmoji} from '@mm-redux/types/emojis';

export function isSystemEmoji(emoji: Emoji): emoji is SystemEmoji {
    return 'batch' in emoji;
}

export function isCustomEmoji(emoji: Emoji): emoji is CustomEmoji {
    return 'id' in emoji;
}

export function getEmojiImageUrl(emoji: Emoji): string {
    if (isCustomEmoji(emoji)) {
        return Client4.getEmojiRoute(emoji.id) + '/image';
    }

    const filename = emoji.filename || emoji.aliases[0];
    return Client4.getSystemEmojiImageUrl(filename);
}

export function parseNeededCustomEmojisFromText(text: string, systemEmojis: Set<string>, customEmojisByName: Map<string, CustomEmoji>, nonExistentEmoji: Set<string>): Set<string> {
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

        if (systemEmojis.has(match[1])) {
            // It's a system emoji, go the next match
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
