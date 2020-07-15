// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as reselect from 'reselect';
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

export const makeGetMentionKeysForPost: (state: GlobalState, disableGroupHighlight: boolean, mentionHighlightDisabled: boolean) => UserMentionKey[] = reselect.createSelector(
    getAllUserMentionKeys,
    getCurrentUserMentionKeys,
    (state: GlobalState, disableGroupHighlight: boolean) => disableGroupHighlight,
    (state: GlobalState, disableGroupHighlight: boolean, mentionHighlightDisabled: boolean) => mentionHighlightDisabled,
    (allMentionKeys, mentionKeysWithoutGroups, disableGroupHighlight = false, mentionHighlightDisabled = false) => {
        let mentionKeys = allMentionKeys;
        if (disableGroupHighlight) {
            mentionKeys = mentionKeysWithoutGroups;
        }

        if (mentionHighlightDisabled) {
            const CHANNEL_MENTIONS = ['@all', '@channel', '@here'];
            mentionKeys = mentionKeys.filter((value) => !CHANNEL_MENTIONS.includes(value.key));
        }

        return mentionKeys;
    },
);

