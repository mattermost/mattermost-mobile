// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';
import {DMS_CATEGORY} from '@constants/categories';
import {
    filterArchivedChannels,
    filterAutoclosedDMs,
    filterManuallyClosedDms,
    getUnreadIds,
    sortChannels,
    type ChannelWithMyChannel,
} from '@utils/categories';

import type {SharedData} from '../category';
import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

export type SortedCategoryChannels = {
    sortedChannels: ChannelModel[];
    unreadIds: Set<string>;
};

export const computeSortedCategoryChannels = (
    category: CategoryModel,
    currentUserId: string,
    locale: string,
    sorting: string,
    sortOrderMap: Map<string, number>,
    managedChannelIds: Set<string>,
    myChannels: MyChannelModel[],
    channels: ChannelModel[],
    sharedData: SharedData,
): SortedCategoryChannels => {
    const maxDms = category.type === DMS_CATEGORY ? sharedData.dmsLimit : Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT;
    const channelMap = new Map<string, ChannelModel>(channels.map((c) => [c.id, c]));

    let cwms: ChannelWithMyChannel[] = myChannels.reduce<ChannelWithMyChannel[]>((acc, mc) => {
        const channel = channelMap.get(mc.id);
        if (channel) {
            acc.push({channel, myChannel: mc, sortOrder: sortOrderMap.get(mc.id) ?? 0});
        }
        return acc;
    }, []);

    cwms = filterArchivedChannels(cwms, sharedData.currentChannelId);
    cwms = filterManuallyClosedDms(cwms, sharedData.notifyProps, sharedData.manuallyClosedPrefs, currentUserId, sharedData.lastUnreadId);
    cwms = filterAutoclosedDMs(
        category.type as CategoryType, maxDms, currentUserId, sharedData.currentChannelId,
        cwms, sharedData.autoclosePrefs, sharedData.notifyProps, sharedData.deactivatedUsers, sharedData.lastUnreadId,
    );

    const unreadIds = getUnreadIds(cwms, sharedData.notifyProps, sharedData.lastUnreadId);

    let sortedChannels = sortChannels(sorting as CategorySorting, cwms, sharedData.notifyProps, locale).
        filter((c) => !managedChannelIds.has(c.id));
    if (sharedData.unreadsOnTop) {
        // Unread channels are already shown in the cross-category rollup at the top of the list.
        sortedChannels = sortedChannels.filter((c) => !unreadIds.has(c.id));
    }

    return {sortedChannels, unreadIds};
};
