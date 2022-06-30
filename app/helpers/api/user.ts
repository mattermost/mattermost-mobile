// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

export const getNeededAtMentionedUsernames = (usernames: Set<string>, posts: Post[], excludeUsername?: string) => {
    const usernamesToLoad = new Set<string>();

    const pattern = /\B@(([a-z0-9_.-]*[a-z0-9_])[.-]*)/gi;

    posts.forEach((p) => {
        let match;
        while ((match = pattern.exec(p.message)) !== null) {
            const lowercaseMatch1 = match[1].toLowerCase();
            const lowercaseMatch2 = match[2].toLowerCase();

            // match[1] is the matched mention including trailing punctuation
            // match[2] is the matched mention without trailing punctuation
            if (General.SPECIAL_MENTIONS.has(lowercaseMatch2)) {
                continue;
            }

            if (lowercaseMatch1 === excludeUsername || lowercaseMatch2 === excludeUsername) {
                continue;
            }

            if (usernames.has(lowercaseMatch1) || usernames.has(lowercaseMatch2)) {
                continue;
            }

            // If there's no trailing punctuation, this will only add 1 item to the set
            usernamesToLoad.add(lowercaseMatch1);
            usernamesToLoad.add(lowercaseMatch2);
        }
    });

    return usernamesToLoad;
};
