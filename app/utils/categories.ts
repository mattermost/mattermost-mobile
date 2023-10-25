// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Preferences} from '@constants';
import {DMS_CATEGORY} from '@constants/categories';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {isDMorGM} from '@utils/channel';
import {getUserIdFromChannelName} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type UserModel from '@typings/database/models/servers/user';

export type ChannelWithMyChannel = {
    channel: ChannelModel;
    myChannel: MyChannelModel;
    sortOrder: number;
}

export function makeCategoryChannelId(teamId: string, channelId: string) {
    return `${teamId}_${channelId}`;
}

export const isUnreadChannel = (myChannel: MyChannelModel, notifyProps?: Partial<ChannelNotifyProps>, lastUnreadChannelId?: string) => {
    const isMuted = notifyProps?.mark_unread === General.MENTION;
    return myChannel.mentionsCount || (!isMuted && myChannel.isUnread) || (myChannel.id === lastUnreadChannelId);
};

export const filterArchivedChannels = (channelsWithMyChannel: ChannelWithMyChannel[], currentChannelId: string) => {
    return channelsWithMyChannel.filter((cwm) => cwm.channel.deleteAt === 0 || cwm.channel.id === currentChannelId);
};

export const filterAutoclosedDMs = (
    categoryType: CategoryType, limit: number, currentUserId: string, currentChannelId: string,
    channelsWithMyChannel: ChannelWithMyChannel[], preferences: PreferenceModel[],
    notifyPropsPerChannel: Record<string, Partial<ChannelNotifyProps>>,
    deactivatedUsers?: Map<string, UserModel | undefined >,
    lastUnreadChannelId?: string,
) => {
    if (categoryType !== DMS_CATEGORY) {
        // Only autoclose DMs that haven't been assigned to a category
        return channelsWithMyChannel;
    }
    const prefMap = preferences.reduce((acc, v) => {
        const existing = acc.get(v.name);
        acc.set(v.name, Math.max((v.value as unknown as number) || 0, existing || 0));
        return acc;
    }, new Map<string, number>());
    const getLastViewedAt = (cwm: ChannelWithMyChannel) => {
        // The server only ever sets the last_viewed_at to the time of the last post in channel, so we may need
        // to use the preferences added for the previous version of autoclosing DMs.
        const id = cwm.channel.id;
        return Math.max(
            cwm.myChannel.lastViewedAt,
            prefMap.get(id) || 0,
        );
    };

    let unreadCount = 0;
    let visibleChannels = channelsWithMyChannel.filter((cwm) => {
        const {channel, myChannel} = cwm;
        if (myChannel.isUnread) {
            unreadCount++;

            // Unread DMs/GMs are always visible
            return true;
        }

        if (channel.id === currentChannelId) {
            return true;
        }

        const lastViewedAt = getLastViewedAt(cwm);

        // DMs with deactivated users will be visible if you're currently viewing them and they were opened
        // since the user was deactivated
        if (channel.type === General.DM_CHANNEL) {
            const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
            const teammate = deactivatedUsers?.get(teammateId);
            if (teammate && teammate.deleteAt > lastViewedAt) {
                return false;
            }
        }

        if (isDMorGM(channel) && !lastViewedAt) {
            return false;
        }

        return true;
    });

    visibleChannels.sort((cwmA, cwmB) => {
        const channelA = cwmA.channel;
        const channelB = cwmB.channel;
        const myChannelA = cwmA.myChannel;
        const myChannelB = cwmB.myChannel;

        // Should always prioritise the current channel
        if (channelA.id === currentChannelId) {
            return -1;
        } else if (channelB.id === currentChannelId) {
            return 1;
        }

        // Second priority is for unread channels
        const isUnreadA = isUnreadChannel(myChannelA, notifyPropsPerChannel[myChannelA.id], lastUnreadChannelId);
        const isUnreadB = isUnreadChannel(myChannelB, notifyPropsPerChannel[myChannelB.id], lastUnreadChannelId);
        if (isUnreadA && !isUnreadB) {
            return -1;
        } else if (isUnreadB && !isUnreadA) {
            return 1;
        }

        // Third priority is last_viewed_at
        const channelAlastViewed = getLastViewedAt(cwmA) || 0;
        const channelBlastViewed = getLastViewedAt(cwmB) || 0;

        if (channelAlastViewed > channelBlastViewed) {
            return -1;
        } else if (channelBlastViewed > channelAlastViewed) {
            return 1;
        }

        return 0;
    });

    // The limit of DMs user specifies to be rendered in the sidebar
    const remaining = Math.max(limit, unreadCount);
    visibleChannels = visibleChannels.slice(0, remaining);

    return visibleChannels;
};

export const filterManuallyClosedDms = (
    channelsWithMyChannel: ChannelWithMyChannel[],
    notifyPropsPerChannel: Record<string, Partial<ChannelNotifyProps>>,
    preferences: PreferenceModel[],
    currentUserId: string,
    lastUnreadChannelId?: string,
) => {
    return channelsWithMyChannel.filter((cwm) => {
        const {channel, myChannel} = cwm;

        if (!isDMorGM(channel)) {
            return true;
        }

        if (isUnreadChannel(myChannel, notifyPropsPerChannel[myChannel.id], lastUnreadChannelId)) {
            // Unread DMs/GMs are always visible
            return true;
        }

        if (channel.type === General.DM_CHANNEL) {
            const teammateId = getUserIdFromChannelName(currentUserId, channel.name);
            return getPreferenceAsBool(preferences, Preferences.CATEGORIES.DIRECT_CHANNEL_SHOW, teammateId, true);
        }

        return getPreferenceAsBool(preferences, Preferences.CATEGORIES.GROUP_CHANNEL_SHOW, channel.id, true);
    });
};

const sortChannelsByName = (notifyPropsPerChannel: Record<string, Partial<ChannelNotifyProps>>, locale: string) => {
    return (a: ChannelWithMyChannel, b: ChannelWithMyChannel) => {
        // Sort muted channels last
        const aMuted = notifyPropsPerChannel[a.channel.id]?.mark_unread === General.MENTION;
        const bMuted = notifyPropsPerChannel[b.channel.id]?.mark_unread === General.MENTION;

        if (aMuted && !bMuted) {
            return 1;
        } else if (!aMuted && bMuted) {
            return -1;
        }

        // And then sort alphabetically
        return a.channel.displayName.localeCompare(b.channel.displayName, locale, {numeric: true});
    };
};

export const sortChannels = (sorting: CategorySorting, channelsWithMyChannel: ChannelWithMyChannel[], notifyPropsPerChannel: Record<string, Partial<ChannelNotifyProps>>, locale: string) => {
    if (sorting === 'recent') {
        return channelsWithMyChannel.sort((cwmA, cwmB) => {
            const a = Math.max(cwmA.myChannel.lastPostAt, cwmA.channel.createAt);
            const b = Math.max(cwmB.myChannel.lastPostAt, cwmB.channel.createAt);
            return b - a;
        }).map((cwm) => cwm.channel);
    } else if (sorting === 'manual') {
        return channelsWithMyChannel.sort((cwmA, cwmB) => {
            return cwmA.sortOrder - cwmB.sortOrder;
        }).map((cwm) => cwm.channel);
    }

    const sortByName = sortChannelsByName(notifyPropsPerChannel, locale);
    return channelsWithMyChannel.sort(sortByName).map((cwm) => cwm.channel);
};

export const getUnreadIds = (cwms: ChannelWithMyChannel[], notifyPropsPerChannel: Record<string, Partial<ChannelNotifyProps>>, lastUnreadId?: string) => {
    return cwms.reduce<Set<string>>((result, cwm) => {
        if (isUnreadChannel(cwm.myChannel, notifyPropsPerChannel[cwm.channel.id], lastUnreadId)) {
            result.add(cwm.channel.id);
        }

        return result;
    }, new Set());
};
