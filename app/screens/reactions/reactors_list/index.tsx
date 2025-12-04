// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import React, {useCallback, useEffect, useRef} from 'react';
import {type ListRenderItemInfo, type NativeScrollEvent, type NativeSyntheticEvent} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import {fetchUsersByIds} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import {useBottomSheetListsFix} from '@hooks/bottom_sheet_lists_fix';

import Reactor from './reactor';

import type ReactionModel from '@typings/database/models/servers/reaction';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    location: AvailableScreens;
    reactions: ReactionModel[];
    type?: BottomSheetList;
}

const ReactorsList = ({location, reactions, type = 'FlatList'}: Props) => {
    const serverUrl = useServerUrl();
    const {direction, enabled, panResponder, setEnabled} = useBottomSheetListsFix();
    const listRef = useRef<FlatList>(null);
    const renderItem = useCallback(({item}: ListRenderItemInfo<ReactionModel>) => (
        <Reactor
            location={location}
            reaction={item}
        />
    ), [reactions]);

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (e.nativeEvent.contentOffset.y <= 0 && enabled && direction === 'down') {
            setEnabled(false);
            listRef.current?.scrollToOffset({animated: true, offset: 0});
        }
    }, [enabled, direction]);

    useEffect(() => {
        const userIds = reactions.map((r) => r.userId);

        // Fetch any missing user
        fetchUsersByIds(serverUrl, userIds);
    }, []);

    if (type === 'BottomSheetFlatList') {
        return (
            <BottomSheetFlatList
                data={reactions}
                renderItem={renderItem}
                overScrollMode={'always'}
                testID='reactions.reactors_list.flat_list'
                scrollEnabled={enabled}
                {...panResponder.panHandlers}
            />
        );
    }

    return (
        <FlatList
            data={reactions}
            ref={listRef}
            renderItem={renderItem}
            onScroll={onScroll}
            overScrollMode={'always'}
            scrollEnabled={enabled}
            scrollEventThrottle={60}
            {...panResponder.panHandlers}
            testID='reactions.reactors_list.flat_list'
        />
    );
};

export default ReactorsList;

