// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FlatList} from 'react-native';

import ChannelListItem from './channel';

type Props = {
    currentChannelId: string;
    sortedIds: string[];
};

const extractKey = (item: any) => item;
const itemLayout = (d: any, index: number) => (
    {length: 40, offset: 40 * index, index}
);

const CategoryBody = ({currentChannelId, sortedIds}: Props) => {
    const ChannelItem = useCallback(({item}: {item: string}) => {
        return (
            <ChannelListItem
                channelId={item}
                isActive={item === currentChannelId}
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
            getItemLayout={itemLayout}
        />
    );
};

export default CategoryBody;
