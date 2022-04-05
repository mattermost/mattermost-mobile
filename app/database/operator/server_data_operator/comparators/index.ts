// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type DraftModel from '@typings/database/models/servers/draft';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type TeamMembershipModel from '@typings/database/models/servers/team_membership';
import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

/**
 *  This file contains all the comparators that are used by the handlers to find out which records to truly update and
 *  which one to create.  A 'record' is a model in our database and a 'raw' is the object that is passed to the handler
 *  (e.g. API response). Each comparator will return a boolean condition after comparing specific fields from the
 *  'record' and the 'raw'
 */

export const buildDraftKey = (draft: DraftModel | Draft) => {
    if ('channel_id' in draft) {
        return `${draft.channel_id}-${draft.root_id}`;
    }
    return `${draft.channelId}-${draft.rootId}`;
};

export const buildPreferenceKey = (pref: PreferenceModel | PreferenceType) => {
    return `${pref.category}-${pref.name}`;
};

export const buildTeamMembershipKey = (member: TeamMembershipModel | TeamMembership) => {
    if ('team_id' in member) {
        return `${member.team_id}-${member.user_id}`;
    }
    return `${member.teamId}-${member.userId}`;
};

export const buildChannelMembershipKey = (membership: ChannelMembershipModel | Pick<ChannelMembership, 'user_id' | 'channel_id'>) => {
    if ('user_id' in membership) {
        return `${membership.user_id}-${membership.channel_id}`;
    }
    return `${membership.userId}-${membership.channelId}`;
};

export const buildTeamSearchHistoryKey = (history: TeamSearchHistoryModel | TeamSearchHistory) => {
    if ('team_id' in history) {
        return `${history.team_id}-${history.term}`;
    }
    return `${history.teamId}-${history.term}`;
};

export const buildMyChannelKey = (myChannel: MyChannelModel | MyChannelSettingsModel | ChannelMembership) => {
    if ('channel_id' in myChannel) {
        return myChannel.channel_id;
    }
    return myChannel.id;
};
