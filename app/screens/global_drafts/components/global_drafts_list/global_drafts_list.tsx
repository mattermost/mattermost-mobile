// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlatList} from '@stream-io/flat-list-mvcp';
import React, {useCallback, useState} from 'react';
import {View, type LayoutChangeEvent, type ListRenderItemInfo} from 'react-native';
import Animated from 'react-native-reanimated';

import {INITIAL_BATCH_TO_RENDER, SCROLL_POSITION_CONFIG} from '@app/components/post_list/config';
import {Screens} from '@app/constants';

import SwipeableDraft from './SwipeableDraft';

import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    allDrafts: DraftModel[];
    location: string;
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const keyExtractor = (item: DraftModel) => item.id;

const GlobalDraftsList: React.FC<Props> = ({
    allDrafts,
    location,
}) => {
    const [layoutWidth, setLayoutWidth] = useState(0);
    const onLayout = useCallback((e: LayoutChangeEvent) => {
        if (location === Screens.GLOBAL_DRAFTS) {
            setLayoutWidth(e.nativeEvent.layout.width - 40); // 40 is the padding of the container
        }
    }, [location]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<DraftModel>) => {
        return (
            <SwipeableDraft
                item={item}
                location={location}
                layoutWidth={layoutWidth}
            />
        );
    }, [layoutWidth, location]);

    return (
        <View
            style={{flex: 1}}
            onLayout={onLayout}
        >
            <AnimatedFlatList
                data={allDrafts}
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER + 5}
                maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                maxToRenderPerBatch={10}
                nativeID={location}
                renderItem={renderItem}
            />
        </View>
    );
};

export default GlobalDraftsList;
