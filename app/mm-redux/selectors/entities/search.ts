// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as reselect from 'reselect';
import {PostProps} from '@mm-redux/types/posts';
import {GlobalState} from '@mm-redux/types/store';
import {UserMentionKey} from './users';
import {getCurrentUserMentionKeys} from '@mm-redux/selectors/entities/users';
import {getCurrentUserGroupMentionKeys} from '@mm-redux/selectors/entities/groups';

import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';

export const getCurrentSearchForCurrentTeam = reselect.createSelector(
    (state: GlobalState) => state.entities.search.current,
    getCurrentTeamId,
    (current, teamId) => {
        return current[teamId];
    },
);

export const getAllUserMentionKeys: (state: GlobalState) => UserMentionKey[] = reselect.createSelector(
    getCurrentUserMentionKeys,
    (state: GlobalState) => getCurrentUserGroupMentionKeys(state),
    (userMentionKeys, groupMentionKeys) => {
        return userMentionKeys.concat(groupMentionKeys);
    },
);

export function makeGetMentionKeysForPost(): (b: GlobalState, a: PostProps) => UserMentionKey[] {
    return reselect.createSelector(
        (state: GlobalState) => getAllUserMentionKeys(state),
        getCurrentUserMentionKeys,
        (state: GlobalState, postProps: PostProps) => postProps,
        (allMentionKeys, mentionKeysWithoutGroups, postProps) => {
            let mentionKeys = allMentionKeys;
            if (postProps?.disable_group_highlight) {
                mentionKeys = mentionKeysWithoutGroups;
            }

            if (postProps?.mentionHighlightDisabled) {
                const CHANNEL_MENTIONS = ['@all', '@channel', '@here'];
                mentionKeys = mentionKeys.filter((value) => !CHANNEL_MENTIONS.includes(value.key));
            }

            return mentionKeys;
        },
    );
}
