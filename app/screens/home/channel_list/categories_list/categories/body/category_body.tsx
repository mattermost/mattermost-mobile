// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList} from 'react-native';

import ChannelItem from '@components/channel_item';
import {DMS_CATEGORY} from '@constants/categories';
import ChannelModel from '@typings/database/models/servers/channel';

import type CategoryModel from '@typings/database/models/servers/category';

type Props = {
    sortedChannels: ChannelModel[];
    hiddenChannelIds: Set<string>;
    category: CategoryModel;
    limit: number;
    onChannelSwitch: (channelId: string) => void;
};

const extractKey = (item: ChannelModel) => item.id;

const CategoryBody = ({sortedChannels, category, hiddenChannelIds, limit, onChannelSwitch}: Props) => {
    const ids = useMemo(() => {
        let filteredChannels = sortedChannels;

        // Remove all closed gm/dms
        if (hiddenChannelIds.size) {
            filteredChannels = sortedChannels.filter((item) => item && !hiddenChannelIds.has(item.id));
        }

        if (category.type === DMS_CATEGORY && limit > 0) {
            return filteredChannels.slice(0, limit - 1);
        }
        return filteredChannels;
    }, [category.type, limit, hiddenChannelIds, sortedChannels]);

    const renderItem = useCallback(({item}: {item: ChannelModel}) => {
        return (
            <ChannelItem
                channel={item}
                collapsed={category.collapsed}
                testID={`category.${category.displayName.replace(/ /g, '_').toLocaleLowerCase()}.channel_list_item`}
                onPress={onChannelSwitch}
            />
        );
    }, [category.collapsed, onChannelSwitch]);

    return (
        <FlatList
            data={ids}
            renderItem={renderItem}
            keyExtractor={extractKey}
            removeClippedSubviews={true}
            initialNumToRender={20}
            windowSize={15}
            updateCellsBatchingPeriod={10}

            // @ts-expect-error strictMode not exposed on the types
            strictMode={true}
        />
    );
};

export default CategoryBody;
