// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList} from 'react-native';

import ChannelListItem from './channel';

import type CategoryModel from '@typings/database/models/servers/category';

type Props = {
    currentChannelId: string;
    sortedIds: string[];
    category: CategoryModel;
    limit: number;
};

const extractKey = (item: string) => item;

const CategoryBody = ({currentChannelId, sortedIds, category, limit}: Props) => {
    const ids = useMemo(() => {
        if (category.type === 'direct_messages' && limit > 0) {
            return sortedIds.slice(0, limit - 1);
        }
        return sortedIds;
    }, [category.type, limit]);

    const ChannelItem = useCallback(({item}: {item: string}) => {
        return (
            <ChannelListItem
                channelId={item}
                isActive={item === currentChannelId}
                collapsed={category.collapsed}
            />
        );
    }, [currentChannelId]);

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
