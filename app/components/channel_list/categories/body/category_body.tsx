// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FlatList} from 'react-native';

import ChannelListItem from './channel';

import type CategoryModel from '@typings/database/models/servers/category';

type Props = {
    currentChannelId: string;
    sortedIds: string[];
    category: CategoryModel;
};

const extractKey = (item: any) => item;

const CategoryBody = ({currentChannelId, sortedIds, category}: Props) => {
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
            data={sortedIds}
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
