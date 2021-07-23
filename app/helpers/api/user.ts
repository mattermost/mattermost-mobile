// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

export const getNeededAtMentionedUsernames = (usernames: Set<string>, posts: Post[], excludeUsername?: string) => {
    const usernamesToLoad = new Set<string>();

    const pattern = /\B@(([a-z0-9_.-]*[a-z0-9_])[.-]*)/gi;

    posts.forEach((p) => {
        let match;
        while ((match = pattern.exec(p.message)) !== null) {
            // match[1] is the matched mention including trailing punctuation
            // match[2] is the matched mention without trailing punctuation
            if (General.SPECIAL_MENTIONS.indexOf(match[2]) !== -1) {
                continue;
            }

            if (match[1] === excludeUsername || match[2] === excludeUsername) {
                continue;
            }

            if (usernames.has(match[1]) || usernames.has(match[2])) {
                continue;
            }

            // If there's no trailing punctuation, this will only add 1 item to the set
            usernamesToLoad.add(match[1]);
            usernamesToLoad.add(match[2]);
        }
    });

    return usernamesToLoad;
};
