// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import {MENTIONS_REGEX} from '@constants/autocomplete';

export const getNeededAtMentionedUsernames = (usernames: Set<string>, posts: Post[], excludeUsername?: string) => {
    const usernamesToLoad = new Set<string>();

    posts.forEach((p) => {
        let match;
        while ((match = MENTIONS_REGEX.exec(p.message)) !== null) {
            const lowercaseMatch = match[1].toLowerCase();

            if (General.SPECIAL_MENTIONS.has(lowercaseMatch)) {
                continue;
            }

            if (lowercaseMatch === excludeUsername) {
                continue;
            }

            if (usernames.has(lowercaseMatch)) {
                continue;
            }

            usernamesToLoad.add(lowercaseMatch);
        }
    });

    return usernamesToLoad;
};
