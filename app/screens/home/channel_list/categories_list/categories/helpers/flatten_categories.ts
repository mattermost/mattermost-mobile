// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {UNREADS_CATEGORY} from '@constants/categories';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

export type FlattenedItem =
    | {type: 'unreads_header'}
    | {type: 'header'; categoryId: string; category: CategoryModel}
    | {type: 'channel'; categoryId: string; channelId: string; channel: ChannelModel};

export type CategoryData = {
    category: CategoryModel;
    sortedChannels: ChannelModel[];
    unreadIds: Set<string>;
    allUnreadChannels: ChannelModel[];
};

export const keyExtractor = (item: FlattenedItem): string => {
    if (item.type === 'unreads_header') {
        return 'unreads_header';
    }
    return item.type === 'header' ? `h:${item.categoryId}` : `c:${item.channelId}`;
};

export const getItemType = (item: FlattenedItem): 'unreads_header' | 'header' | 'channel' => {
    return item.type;
};

export const flattenCategories = (
    categoriesData: CategoryData[],
    unreadsOnTop: boolean,
): FlattenedItem[] => {
    const result: FlattenedItem[] = [];

    if (unreadsOnTop) {
        const allUnreadChannels: ChannelModel[] = [];
        const seenChannelIds = new Set<string>();

        for (const {allUnreadChannels: categoryUnreads} of categoriesData) {
            for (const channel of categoryUnreads) {
                if (!seenChannelIds.has(channel.id)) {
                    seenChannelIds.add(channel.id);
                    allUnreadChannels.push(channel);
                }
            }
        }

        if (allUnreadChannels.length > 0) {
            result.push({type: 'unreads_header'});

            for (const channel of allUnreadChannels) {
                result.push({
                    type: 'channel',
                    categoryId: UNREADS_CATEGORY,
                    channelId: channel.id,
                    channel,
                });
            }
        }
    }

    for (const {category, sortedChannels, unreadIds} of categoriesData) {
        result.push({
            type: 'header',
            categoryId: category.id,
            category,
        });

        const channelsToShow = category.collapsed? sortedChannels.filter((channel) => unreadIds.has(channel.id)): sortedChannels;

        for (const channel of channelsToShow) {
            result.push({
                type: 'channel',
                categoryId: category.id,
                channelId: channel.id,
                channel,
            });
        }
    }

    return result;
};
