// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, ListRenderItemInfo, StyleSheet, View} from 'react-native';
import Animated, {FadeInDown, FadeOutUp} from 'react-native-reanimated';

import {switchToChannelById} from '@actions/remote/channel';
import ChannelItem from '@components/channel_item';
import NoResultsWithTerm from '@components/no_results_with_term';
import {useServerUrl} from '@context/server';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    close: () => Promise<void>;
    keyboardHeight: number;
    showTeamName: boolean;
    term: string;
}

const style = StyleSheet.create({
    flex: {flex: 1},
    noResultContainer: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const UnfilteredList = ({close, keyboardHeight, showTeamName, term}: Props) => {
    const serverUrl = useServerUrl();
    const [data] = useState([]);
    const flatListStyle = useMemo(() => ({flexGrow: 1, paddingBottom: keyboardHeight}), [keyboardHeight]);

    const onPress = useCallback(async (channelId: string) => {
        await close();
        switchToChannelById(serverUrl, channelId);
    }, [serverUrl, close]);

    const renderNoResults = useCallback(() => {
        if (term) {
            return (
                <View style={style.noResultContainer}>
                    <NoResultsWithTerm term={term}/>
                </View>
            );
        }

        return null;
    }, [term]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<ChannelModel>) => {
        return (
            <ChannelItem
                channel={item}
                collapsed={false}
                isInfo={true}
                onPress={onPress}
                showTeamName={showTeamName}
            />
        );
    }, [onPress, showTeamName]);

    return (
        <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutUp.duration(200)}
            style={style.flex}
        >
            <FlatList
                contentContainerStyle={flatListStyle}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
                ListEmptyComponent={renderNoResults}
                renderItem={renderItem}
                data={data}
                showsVerticalScrollIndicator={false}
            />
        </Animated.View>
    );
};

export default UnfilteredList;
