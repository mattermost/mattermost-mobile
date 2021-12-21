// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

import React from 'react';
import {FlatList} from 'react-native';

import ChannelListItem from './channel';

import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';

const sortChannels = (sortType: CategorySorting, channels: ChannelModel[], manualSortOrder: string[]) => {
    switch (sortType) {
        case 'alpha':
            return channels.sort((a, b) => a.displayName.localeCompare(b.displayName));
        case 'manual':
            return manualSortOrder.map((channelId) => channels.find(c => c.id === channelId)!);
        default:
        case 'recent':
            return channels.sort((a, b) => a.lastPostAt - b.lastPostAt);
    }
};

const renderChannelItem = (data: { item: ChannelModel }) => {
    return (
        <ChannelListItem
            icon={'globe'}
            name={data.item.displayName}

            // highlight={data.item.is}
        />
    );
};

type Props = {
    category: CategoryModel;
    channels: ChannelModel[];
    categoryChannels: CategoryChannelModel[];
};

const CategoryBody = ({category, channels, categoryChannels}: Props) => {
    // What is our sort type?
    const sortedChannels = categoryChannels.sort((a,b) => a.sortOrder - b.sortOrder).map(c => c.channelId);
    const c = sortChannels(category.sorting, channels, sortedChannels);

    return (
        <FlatList
            data={c}
            renderItem={renderChannelItem}
        />
    );
};

const withCategory = withObservables(['category'], ({category}: {category: CategoryModel}) => ({
    category,
    categoryChannels: category.categoryChannels.observeWithColumns(['sort_order']),
    channels: category.channels
}));

export default withCategory(CategoryBody);
