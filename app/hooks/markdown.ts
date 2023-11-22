// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {useMemo} from 'react';

import {getUsersByUsername} from '@utils/user';

import type GroupModel from '@typings/database/models/servers/group';
import type UserModel from '@typings/database/models/servers/user';

export function useMemoMentionedUser(users: UserModel[], mentionName: string) {
    return useMemo(() => {
        const usersByUsername = getUsersByUsername(users);
        let mn = mentionName.toLowerCase();

        while (mn.length > 0) {
            if (usersByUsername[mn]) {
                return usersByUsername[mn];
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mn)) {
                mn = mn.substring(0, mn.length - 1);
            } else {
                break;
            }
        }

        return undefined;
    }, [users, mentionName]);
}

export function useMemoMentionedGroup(groups: GroupModel[], user: UserModel | undefined, mentionName: string) {
    // Checks if the mention is a group
    return useMemo(() => {
        if (user?.username) {
            return undefined;
        }
        const getGroupsByName = (gs: GroupModel[]) => {
            const groupsByName: Dictionary<GroupModel> = {};

            for (const g of gs) {
                groupsByName[g.name] = g;
            }

            return groupsByName;
        };

        const groupsByName = getGroupsByName(groups);
        let mn = mentionName.toLowerCase();

        while (mn.length > 0) {
            if (groupsByName[mn]) {
                return groupsByName[mn];
            }

            // Repeatedly trim off trailing punctuation in case this is at the end of a sentence
            if ((/[._-]$/).test(mn)) {
                mn = mn.substring(0, mn.length - 1);
            } else {
                break;
            }
        }

        return undefined;
    }, [groups, user, mentionName]);
}
