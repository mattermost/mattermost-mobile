// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {FlatList} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {fetchDirectChannelsInfo} from '@actions/remote/channel';
import {useServerUrl} from '@app/context/server';
import ChannelItem from '@components/channel_item';
import {DMS_CATEGORY} from '@constants/categories';
import {isDMorGM} from '@utils/channel';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    sortedChannels: ChannelModel[];
    category: CategoryModel;
    limit: number;
    onChannelSwitch: (channelId: string) => void;
    unreadChannels: ChannelModel[];
};

const extractKey = (item: ChannelModel) => item.id;

const CategoryBody = ({sortedChannels, category, limit, onChannelSwitch, unreadChannels}: Props) => {
    const serverUrl = useServerUrl();
    const ids = useMemo(() => {
        const filteredChannels = sortedChannels;

        if (category.type === DMS_CATEGORY && limit > 0) {
            return filteredChannels.slice(0, limit);
        }
        return filteredChannels;
    }, [category.type, limit, sortedChannels]);

    const directChannels = useMemo(() => {
        return ids.concat(unreadChannels).filter(isDMorGM);
    }, [ids.length, unreadChannels.length]);

    const renderItem = useCallback(({item}: {item: ChannelModel}) => {
        return (
            <ChannelItem
                channel={item}
                testID={`category.${category.displayName.replace(/ /g, '_').toLocaleLowerCase()}.channel_list_item`}
                onPress={onChannelSwitch}
                key={item.id}
            />
        );
    }, [onChannelSwitch]);

    const sharedValue = useSharedValue(category.collapsed);

    useEffect(() => {
        sharedValue.value = category.collapsed;
    }, [category.collapsed]);

    useEffect(() => {
        fetchDirectChannelsInfo(serverUrl, directChannels);
    }, [directChannels.length]);

    const height = ids.length ? ids.length * 40 : 0;
    const unreadHeight = unreadChannels.length ? unreadChannels.length * 40 : 0;

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = unreadHeight > 0 ? 1 : 0;
        const heightDuration = unreadHeight > 0 ? 200 : 300;
        return {
            height: withTiming(sharedValue.value ? unreadHeight : height, {duration: heightDuration}),
            opacity: withTiming(sharedValue.value ? opacity : 1, {duration: sharedValue.value ? 200 : 300, easing: Easing.inOut(Easing.exp)}),
        };
    }, [height, unreadHeight]);

    return (
        <Animated.View style={animatedStyle}>
            <FlatList
                data={category.collapsed ? unreadChannels : ids}
                renderItem={renderItem}
                keyExtractor={extractKey}

                // @ts-expect-error strictMode not exposed on the types
                strictMode={true}
            />
        </Animated.View>
    );
};

export default CategoryBody;
