// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList} from 'react-native';

import ChannelModel from '@typings/database/models/servers/channel';

import ChannelListItem from './channel';

import type CategoryModel from '@typings/database/models/servers/category';

type Props = {
    currentChannelId: string;
    sortedChannels: ChannelModel[];
    hiddenChannelIds: string[];
    category: CategoryModel;
    limit: number;
};

const extractKey = (item: ChannelModel) => item.id;

const CategoryBody = ({currentChannelId, sortedChannels, category, hiddenChannelIds, limit}: Props) => {
    const ids = useMemo(() => {
        let filteredChannels = sortedChannels;

        // Remove all closed gm/dms
        if (hiddenChannelIds.length) {
            filteredChannels = sortedChannels.filter((item) => item && !hiddenChannelIds.includes(item.id));
        }

        if (category.type === 'direct_messages' && limit > 0) {
            return filteredChannels.slice(0, limit - 1);
        }
        return filteredChannels;
    }, [category.type, limit, hiddenChannelIds, sortedChannels]);

    const ChannelItem = useCallback(({item}: {item: ChannelModel}) => {
        return (
            <ChannelListItem
                channel={item}
                isActive={item.id === currentChannelId}
                collapsed={category.collapsed}
            />
        );
    }, [currentChannelId, category.collapsed]);

    return (
        <FlatList
            data={ids}
            renderItem={ChannelItem}
            keyExtractor={extractKey}
            removeClippedSubviews={true}
            initialNumToRender={20}
            windowSize={15}
            updateCellsBatchingPeriod={10}
        />
    );
};

export default CategoryBody;
