// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';

// import * as _ from 'lodash';
import React from 'react';
import {FlatList} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import ChannelListItem from './channel';

import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

const sortChannels = (sortType: CategorySorting, channels: ChannelModel[]) => {
    switch (sortType) {
        case 'alpha':
            return channels.sort((a, b) => a.displayName.localeCompare(b.displayName));
        case 'manual':
        case 'recent':
            return channels.sort(async (a, b) => {
                const c = await a.membership.observe();
            });
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

const withChannel = withObservables(['channel'], ({channel}: {channel: ChannelModel}) => ({
    channel,
    membership: channel.membership,
}));

const CategoryBody = ({category, channels, categoryChannels}: Props) => {
    // What is our sort type?
    const sortedChannels: ChannelModel[] = [];

    return (
        <FlatList
            data={sortedChannels}
            renderItem={renderChannelItem}
        />
    );
};

const withCategory = withObservables(['category'], ({category}: {category: CategoryModel}) => ({
    category,
    categoryChannels: category.categoryChannels.observeWithColumns(['sort_order']),
    channels: category.channels.observe().pipe(
        switchMap((channels) => {
            if (!channels.length) {
                return of$([]);
            }

            const cs = channels.map((c) => {
                return c;
            });

            return cs;
        }),
    ),
}));

export default withCategory(CategoryBody);
