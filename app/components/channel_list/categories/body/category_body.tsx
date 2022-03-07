// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {FlatList} from 'react-native';

import {List} from '@constants';

import ChannelListItem from './channel';

import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

type Props = {
    category: CategoryModel;
    channels: ChannelModel[];
    myChannels: MyChannelModel[];
    categoryChannels: CategoryChannelModel[];
};

const ChannelItem = ({item}: {item: string}) => {
    return (
        <ChannelListItem channelId={item}/>
    );
};

const extractKey = (item: any) => item;

const CategoryBody = ({category, categoryChannels, channels, myChannels}: Props) => {
    const data: string[] = useMemo(() => {
        switch (category.sorting) {
            case 'alpha':
                return channels.map((c) => c.id);
            case 'manual':
                return categoryChannels.map((cc) => cc.channelId);
            default:
                return myChannels.map((m) => m.id);
        }
    }, [category.sorting, categoryChannels, channels, myChannels]);

    return (
        <FlatList
            data={data}
            renderItem={ChannelItem}
            keyExtractor={extractKey}
            removeClippedSubviews={true}
            initialNumToRender={20}
            windowSize={15}
            updateCellsBatchingPeriod={10}
            maxToRenderPerBatch={10}
            getItemLayout={(d, index) => (
                {length: 40, offset: 40 * index, index}
            )}
            viewabilityConfig={List.VISIBILITY_CONFIG_DEFAULTS}
        />
    );
};

export default CategoryBody;
