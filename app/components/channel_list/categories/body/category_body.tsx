// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList} from 'react-native';

import ChannelListItem from './channel';

import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    category: CategoryModel;
    channels: ChannelModel[];
    categoryChannels: CategoryChannelModel[];
};

const CategoryBody = ({category, channels, categoryChannels}: Props) => {
    if (category.sorting === 'manual') {
        categoryChannels.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (category.sorting === 'alpha') {
        categoryChannels.sort((a, b) => {
            return channels.findIndex((c) => c.id === a.channelId) - channels.findIndex((c) => c.id === b.channelId);
        });
    }

    if (category.sorting === 'recent') {
        channels.sort((a, b) => a.lastPostAt - b.lastPostAt);

        categoryChannels.sort((a, b) => {
            return channels.findIndex((c) => c.id === a.channelId) - channels.findIndex((c) => c.id === b.channelId);
        });
    }

    const ChannelItem = (data: { item: CategoryChannelModel }) => {
        const c = channels.find((channel) => channel.id === data.item.channelId);

        if (!c) {
            return <></>;
        }
        return (

            // <ChannelListItem channelId={data.item.channelId}/>
            <ChannelListItem channel={c}/>
        );
    };

    return (
        <FlatList
            data={categoryChannels}
            renderItem={ChannelItem}
        />
    );
};

export default CategoryBody;
