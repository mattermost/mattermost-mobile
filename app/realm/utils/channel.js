// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from 'app/constants';
import {getUserIdFromChannelName} from 'app/utils/channels';

export function channelDataToRealm(channel) {
    return {
        id: channel.id,
        createAt: channel.create_at,
        updateAt: channel.update_at,
        deleteAt: channel.delete_at,
        creatorId: channel.creator_id,
        team: channel.team,
        type: channel.type,
        displayName: channel.display_name,
        name: channel.name,
        header: channel.header,
        lastPostAt: channel.last_post_at,
        totalMsgCount: channel.total_msg_count,
        purpose: channel.purpose,
        groupConstrained: channel.group_constrained || false,
        members: channel.members,
        guestCount: channel.guest_count,
    };
}

export function channelMemberDataToRealm(member) {
    return {
        id: `${member.channel_id}-${member.user_id}`,
        user: member.user,
        roles: member.roles,
        lastViewAt: member.last_viewed_at,
        lastUpdateAt: member.last_update_at,
        msgCount: member.msg_count,
        mentionCount: member.mention_count,
        notifyProps: JSON.stringify(member.notify_props),
        schemeUser: member.scheme_user,
        schemeAdmin: member.scheme_admin,
        schemeGuest: member.scheme_guest,
    };
}

export function isDirectMessageVisible(realm, currentUserId, channelName) {
    const otherUserId = getUserIdFromChannelName(currentUserId, channelName);
    const dmPref = realm.objectForPrimaryKey('Preference', `${Preferences.CATEGORY_DIRECT_CHANNEL_SHOW}-${otherUserId}`);
    return dmPref?.value === 'true';
}

export function isGroupMessageVisible(realm, channelId) {
    const gmPref = realm.objectForPrimaryKey('Preference', `${Preferences.CATEGORY_GROUP_CHANNEL_SHOW}-${channelId}`);
    return gmPref?.value === 'true';
}
