// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Preferences} from 'app/constants';
import {displayUserName} from './user';

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

export function isDirectMessageVisible(preferences, currentUserId, channelName) {
    const otherUserId = getUserIdFromChannelName(currentUserId, channelName);
    const dmPref = preferences.filtered('id = $0', `${Preferences.CATEGORY_DIRECT_CHANNEL_SHOW}-${otherUserId}`)[0];
    return dmPref?.value === 'true';
}

export function isGroupMessageVisible(preferences, channelId) {
    const gmPref = preferences.filtered('id = $0', `${Preferences.CATEGORY_GROUP_CHANNEL_SHOW}-${channelId}`);
    return gmPref?.value === 'true';
}

export function getDirectChannelName(id, otherId) {
    let handle;

    if (otherId > id) {
        handle = id + '__' + otherId;
    } else {
        handle = otherId + '__' + id;
    }

    return handle;
}

export function getUserIdFromChannelName(userId, channelName) {
    const ids = channelName.split('__');
    let otherUserId = '';
    if (ids[0] === userId) {
        otherUserId = ids[1];
    } else {
        otherUserId = ids[0];
    }

    return otherUserId;
}

export function sortChannelsByDisplayName(currentUserId, locale, teammateNameDisplaySettings, a, b) {
    const displayNameA = getChannelDisplayName(a, currentUserId, locale, teammateNameDisplaySettings);
    const displayNameB = getChannelDisplayName(b, currentUserId, locale, teammateNameDisplaySettings);

    return displayNameA.toLowerCase().localeCompare(displayNameB.toLowerCase(), locale, {numeric: true});
}

export function sortChannelsByRecency(channelMembers, a, b) {
    const memberA = channelMembers[a.id];
    const memberB = channelMembers[b.id];

    return memberB.lastUpdateAt - memberA.lastUpdateAt;
}

export function sortChannelsByRecencyOrAlpha(currentUserId, locale, teammateNameDisplaySettings, channelMembers, sortingType, a, b) {
    if (sortingType === 'recent' && channelMembers) {
        return sortChannelsByRecency(channelMembers, a, b);
    }

    return sortChannelsByDisplayName(currentUserId, locale, teammateNameDisplaySettings, a, b);
}

export function isChannelMuted(member) {
    return member?.notifyPropsAsJSON?.mark_unread === General.MENTION || false; //eslint-disable-line camelcase
}

export function getChannelDisplayName(channel, currentUserId, locale, teammateNameDisplaySetting) {
    if (channel?.type === General.OPEN_CHANNEL || channel?.type === General.PRIVATE_CHANNEL) {
        return channel.displayName;
    }

    const names = [];
    if (channel?.members?.length) {
        channel.members.forEach((m) => {
            if (m.user.id !== currentUserId || isOwnDirectMessage(channel, currentUserId)) {
                names.push(displayUserName(m.user, locale, teammateNameDisplaySetting));
            }
        });
    }

    return names.join(', ').trim().replace(/,\s*$/, '');
}

export function isOwnDirectMessage(channel, currentUserId) {
    if (channel?.type === General.DM_CHANNEL) {
        const otherUserId = getUserIdFromChannelName(currentUserId, channel.name);

        return otherUserId === currentUserId;
    }

    return false;
}
