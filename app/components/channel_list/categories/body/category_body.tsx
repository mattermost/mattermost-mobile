// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList} from 'react-native';

import ChannelListItem from './channel';

import type CategoryModel from '@typings/database/models/servers/category';

type Props = {
    currentChannelId: string;
    sortedIds: string[];
    hiddenChannelIds: string[];
    category: CategoryModel;
    limit: number;
};

const extractKey = (item: string) => item;

const CategoryBody = ({currentChannelId, sortedIds, category, hiddenChannelIds, limit}: Props) => {
    const ids = useMemo(() => {
        let filteredIds = sortedIds;

        // Remove all closed gm/dms
        if (hiddenChannelIds.length) {
            filteredIds = sortedIds.filter((id) => !hiddenChannelIds.includes(id));
        }

        if (category.type === 'direct_messages' && limit > 0) {
            return filteredIds.slice(0, limit - 1);
        }
        return filteredIds;
    }, [category.type, limit, hiddenChannelIds]);

    const ChannelItem = useCallback(({item}: {item: string}) => {
        return (
            <ChannelListItem
                channelId={item}
                isActive={item === currentChannelId}
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
