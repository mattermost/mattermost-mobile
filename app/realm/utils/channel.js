// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Permissions, Preferences} from 'app/constants';
import {havePermission} from './role';
import {displayUserName} from './user';

export function areChannelMentionsIgnored(channelMember) {
    let ignoreChannelMentionsDefault = General.IGNORE_CHANNEL_MENTIONS_OFF;
    let currentUserNotifyProps;
    let channelMemberNotifyProps;

    if (channelMember?.user?.notifyProps) {
        currentUserNotifyProps = channelMember.user.notifyPropsAsJSON || JSON.parse(channelMember.user.notifyProps);
    }

    if (channelMember?.notifyProps) {
        channelMemberNotifyProps = channelMember.notifyPropsAsJSON || JSON.parse(channelMember.notifyProps);
    }

    if (currentUserNotifyProps?.channel === 'false') {
        ignoreChannelMentionsDefault = General.IGNORE_CHANNEL_MENTIONS_ON;
    }

    //eslint-disable-next-line camelcase
    let ignoreChannelMentions = channelMemberNotifyProps?.ignore_channel_mentions;
    if (!ignoreChannelMentions || ignoreChannelMentions === General.IGNORE_CHANNEL_MENTIONS_DEFAULT) {
        ignoreChannelMentions = ignoreChannelMentionsDefault;
    }

    return ignoreChannelMentions !== General.IGNORE_CHANNEL_MENTIONS_OFF;
}

export function canDeleteChannel(roles, myRoles, channel) {
    if (channel.type === General.OPEN_CHANNEL) {
        return havePermission(roles, myRoles, Permissions.DELETE_PUBLIC_CHANNEL);
    } else if (channel.type === General.PRIVATE_CHANNEL) {
        return havePermission(roles, myRoles, Permissions.DELETE_PRIVATE_CHANNEL);
    }

    return true;
}

export function canEditChannel(roles, myRoles, channel) {
    if (channel.type === General.OPEN_CHANNEL) {
        return havePermission(roles, myRoles, Permissions.MANAGE_PUBLIC_CHANNEL_PROPERTIES);
    } else if (channel.type === General.PRIVATE_CHANNEL) {
        return havePermission(roles, myRoles, Permissions.MANAGE_PRIVATE_CHANNEL_PROPERTIES);
    }
    return true;
}

export function canManageChannelMembers(roles, myRoles, channel) {
    if (!channel || channel.deleteAt > 0 || channel.groupConstrained) {
        return false;
    }

    if (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL || channel.name === General.DEFAULT_CHANNEL) {
        return false;
    }

    if (channel.type === General.OPEN_CHANNEL) {
        return havePermission(roles, myRoles, Permissions.MANAGE_PUBLIC_CHANNEL_MEMBERS);
    } else if (channel.type === General.PRIVATE_CHANNEL) {
        return havePermission(roles, myRoles, Permissions.MANAGE_PRIVATE_CHANNEL_MEMBERS);
    }

    return true;
}

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

export function isChannelMuted(channelMember) {
    if (channelMember?.notifyProps) {
        const notifyProps = channelMember.notifyPropsAsJSON || JSON.parse(channelMember.notifyProps);
        return notifyProps.mark_unread === General.MENTION;
    }

    return false;
}

export function isChannelReadOnly(channel, isSystemAdmin, experimentalTownSquareIsReadOnly) {
    return channel?.name === General.DEFAULT_CHANNEL && !isSystemAdmin && experimentalTownSquareIsReadOnly === 'true';
}

export function isDirectMessageVisible(preferences, currentUserId, channelName) {
    const otherUserId = getUserIdFromChannelName(currentUserId, channelName);
    const dmPref = preferences.filtered('id = $0', `${Preferences.CATEGORY_DIRECT_CHANNEL_SHOW}-${otherUserId}`)[0];
    return dmPref?.value === 'true';
}

export function isFavoriteChannel(preferences, id) {
    const fav = preferences.filtered('id = $0', `${Preferences.CATEGORY_FAVORITE_CHANNEL}-${id}`)[0];
    return fav?.value === 'true';
}

export function isGroupMessageVisible(preferences, channelId) {
    const gmPref = preferences.filtered('id = $0', `${Preferences.CATEGORY_GROUP_CHANNEL_SHOW}-${channelId}`);
    return gmPref?.value === 'true';
}

export function isOwnDirectMessage(channel, currentUserId) {
    if (channel?.type === General.DM_CHANNEL) {
        const otherUserId = getUserIdFromChannelName(currentUserId, channel.name);

        return otherUserId === currentUserId;
    }

    return false;
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
