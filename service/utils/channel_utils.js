// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Constants} from 'service/constants';
import {displayUsername} from './user_utils';
import {getPreferencesByCategory} from './preference_utils';

const defaultPrefix = 'D'; // fallback for future types
const typeToPrefixMap = {[Constants.OPEN_CHANNEL]: 'A', [Constants.PRIVATE_CHANNEL]: 'B', [Constants.DM_CHANNEL]: 'C'};

export function buildDisplayableChannelList(usersState, teamsState, allChannels, myPreferences) {
    const missingDMChannels = createMissingDirectChannels(usersState.currentId, allChannels, myPreferences);
    const channels = allChannels.
    concat(missingDMChannels).
    map(completeDirectChannelInfo.bind(null, usersState, myPreferences));

    channels.sort((a, b) => {
        const locale = usersState.profiles[usersState.currentId].locale;

        return buildDisplayNameAndTypeComparable(a).
        localeCompare(buildDisplayNameAndTypeComparable(b), locale, {numeric: true});
    });

    const favoriteChannels = channels.filter(isFavoriteChannel.bind(null, myPreferences));
    const notFavoriteChannels = channels.filter(not(isFavoriteChannel.bind(null, myPreferences)));
    const directChannels = notFavoriteChannels.
    filter(
        andX(
            isDirectChannel,
            isDirectChannelVisible.bind(null, usersState.currentId, myPreferences)
        )
    );

    return {
        favoriteChannels,
        publicChannels: notFavoriteChannels.filter(isOpenChannel),
        privateChannels: notFavoriteChannels.filter(isPrivateChannel),
        directChannels: directChannels.filter(
            isConnectedToTeamMember.bind(null, teamsState.membersInTeam[teamsState.currentId])
        ),
        directNonTeamChannels: directChannels.filter(
            isNotConnectedToTeamMember.bind(null, teamsState.membersInTeam[teamsState.currentId])
        )
    };
}

export function getNotMemberChannels(allChannels, myMembers) {
    return allChannels.filter(not(isNotMemberOf.bind(this, myMembers)));
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

export function getChannelByName(channels, name) {
    const channelIds = Object.keys(channels);
    for (let i = 0; i < channelIds.length; i++) {
        const id = channelIds[i];
        if (channels[id].name === name) {
            return channels[id];
        }
    }
    return null;
}

function isOpenChannel(channel) {
    return channel.type === Constants.OPEN_CHANNEL;
}

function isPrivateChannel(channel) {
    return channel.type === Constants.PRIVATE_CHANNEL;
}

function isConnectedToTeamMember(members, channel) {
    return members && members.has(channel.teammate_id);
}

function isNotConnectedToTeamMember(members, channel) {
    if (!members) {
        return true;
    }
    return !members.has(channel.teammate_id);
}

function isDirectChannel(channel) {
    return channel.type === Constants.DM_CHANNEL;
}

export function isDirectChannelVisible(userId, myPreferences, channel) {
    const channelId = getUserIdFromChannelName(userId, channel.name);
    const dm = myPreferences[`${Constants.CATEGORY_DIRECT_CHANNEL_SHOW}--${channelId}`];
    return dm && dm.value === 'true';
}

function isFavoriteChannel(myPreferences, channel) {
    const fav = myPreferences[`${Constants.CATEGORY_FAVORITE_CHANNEL}--${channel.id}`];
    channel.isFavorite = fav && fav.value === 'true';
    return channel.isFavorite;
}

function createMissingDirectChannels(currentUserId, allChannels, myPreferences) {
    const preferences = getPreferencesByCategory(myPreferences, Constants.CATEGORY_DIRECT_CHANNEL_SHOW);

    return Array.
    from(preferences).
    filter((entry) => entry[1] === 'true').
    map((entry) => entry[0]).
    filter((teammateId) => !allChannels.some(isDirectChannelForUser.bind(null, currentUserId, teammateId))).
    map(createFakeChannelCurried(currentUserId));
}

function isDirectChannelForUser(userId, otherUserId, channel) {
    return channel.type === Constants.DM_CHANNEL && getUserIdFromChannelName(userId, channel.name) === otherUserId;
}

function isNotMemberOf(myMembers, channel) {
    return myMembers[channel.id];
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

function createFakeChannel(userId, otherUserId) {
    return {
        name: getDirectChannelName(userId, otherUserId),
        last_post_at: 0,
        total_msg_count: 0,
        type: Constants.DM_CHANNEL,
        fake: true
    };
}

function createFakeChannelCurried(userId) {
    return (otherUserId) => createFakeChannel(userId, otherUserId);
}

export function completeDirectChannelInfo(usersState, myPreferences, channel) {
    if (!isDirectChannel(channel)) {
        return channel;
    }

    const dmChannelClone = {...channel};
    const teammateId = getUserIdFromChannelName(usersState.currentId, channel.name);

    return Object.assign(dmChannelClone, {
        display_name: displayUsername(usersState.profiles[teammateId], myPreferences),
        teammate_id: teammateId,
        status: usersState.statuses[teammateId] || 'offline'
    });
}

export function buildDisplayNameAndTypeComparable(channel) {
    return (typeToPrefixMap[channel.type] || defaultPrefix) + channel.display_name.toLocaleLowerCase() + channel.name.toLocaleLowerCase();
}

function not(f) {
    return (...args) => !f(...args);
}

function andX(...fns) {
    return (...args) => fns.every((f) => f(...args));
}

export function cleanUpUrlable(input) {
    let cleaned = input.trim().replace(/-/g, ' ').replace(/[^\w\s]/gi, '').toLowerCase().replace(/\s/g, '-');
    cleaned = cleaned.replace(/-{2,}/, '-');
    cleaned = cleaned.replace(/^-+/, '');
    cleaned = cleaned.replace(/-+$/, '');
    return cleaned;
}
