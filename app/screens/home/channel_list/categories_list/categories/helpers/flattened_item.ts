// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

export type CategoryMembership = {
    channelIds: string[];
    sortOrderMap: Map<string, number>;
};

export type FlattenedItem =
    | {type: 'unreads_header'}
    | {type: 'header'; categoryId: string; category: CategoryModel}
    | {type: 'channel'; categoryId: string; categoryType: string; channelId: string; channel: ChannelModel}
    | {type: 'category'; category: CategoryModel; membership: CategoryMembership};

export const keyExtractor = (item: FlattenedItem): string => {
    if (item.type === 'unreads_header') {
        return 'unreads_header';
    }
    if (item.type === 'header') {
        return `h:${item.categoryId}`;
    }
    if (item.type === 'category') {
        return `cat:${item.category.id}`;
    }
    return `c:${item.channelId}`;
};

export const getItemType = (item: FlattenedItem): 'unreads_header' | 'header' | 'channel' | 'category' => {
    return item.type;
};
