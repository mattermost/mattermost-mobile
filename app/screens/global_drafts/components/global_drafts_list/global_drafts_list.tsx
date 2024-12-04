// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlatList} from '@stream-io/flat-list-mvcp';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {InteractionManager, Platform, StyleSheet, View, type LayoutChangeEvent, type ListRenderItemInfo} from 'react-native';
import Animated, {FadeIn, FadeOut, useAnimatedStyle, withDelay, withTiming} from 'react-native-reanimated';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeDraftsTutorial} from '@actions/app/global';
import {INITIAL_BATCH_TO_RENDER, SCROLL_POSITION_CONFIG} from '@components/post_list/config';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {popTopScreen} from '@screens/navigation';

import DraftEmptyComponent from '../draft_empty_component';

import SwipeableDraft from './SwipeableDraft';
import DraftTooltip from './tooltip';

import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    allDrafts: DraftModel[];
    location: string;
    tutorialWatched: boolean;
}

const styles = StyleSheet.create({
    empty: {
        alignItems: 'center',
        flexGrow: 1,
        justifyContent: 'center',
    },
    tooltipStyle: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowRadius: 2,
        shadowOpacity: 0.16,
    },
});

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const keyExtractor = (item: DraftModel) => item.id;

const GlobalDraftsList: React.FC<Props> = ({
    allDrafts,
    location,
    tutorialWatched,
}) => {
    const [layoutWidth, setLayoutWidth] = useState(0);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const isTablet = useIsTablet();
    const onLayout = useCallback((e: LayoutChangeEvent) => {
        if (location === Screens.GLOBAL_DRAFTS) {
            setLayoutWidth(e.nativeEvent.layout.width - 40); // 40 is the padding of the container
        }
    }, [location]);

    const firstDraftId = allDrafts.length ? allDrafts[0].id : '';

    const tooltipContentStyle = useMemo(() => ({
        borderRadius: 8,
        maxWidth: isTablet ? 352 : 247,
        padding: 0,
        height: 160,
    }), [isTablet]);

    useEffect(() => {
        InteractionManager.runAfterInteractions(() => {
            if (tutorialWatched) {
                setTooltipVisible(true);
            }
        });
    }, [tutorialWatched]);

    const collapse = useCallback(() => {
        if (Platform.OS === 'android') {
            popTopScreen(Screens.GLOBAL_DRAFTS);
        }
    }, []);

    useAndroidHardwareBackHandler(Screens.GLOBAL_DRAFTS, collapse);

    const close = useCallback(() => {
        setTooltipVisible(false);
        storeDraftsTutorial();
    }, []);

    const widthAnimatedStyle = useAnimatedStyle(() => {
        return {
            width: withDelay(400, withTiming(layoutWidth + 40, {duration: 300})),
            marginLeft: Platform.OS === 'android' ? 10 : undefined,
        };
    }, [layoutWidth]);

    const opacityStyle = useAnimatedStyle(() => {
        return {
            opacity: withDelay(700, withTiming(1, {duration: 350})),
        };
    }, []);

    const renderItem = useCallback(({item}: ListRenderItemInfo<DraftModel>) => {
        if (item.id === firstDraftId && tutorialWatched) {
            return (
                <Tooltip
                    isVisible={tooltipVisible}
                    useInteractionManager={true}
                    contentStyle={tooltipContentStyle}
                    placement={isTablet ? 'left' : 'bottom'}
                    content={<DraftTooltip onClose={close}/>}
                    onClose={close}
                    tooltipStyle={styles.tooltipStyle}
                >
                    <Animated.View
                        style={widthAnimatedStyle}
                        exiting={FadeOut}
                        entering={FadeIn}
                    >
                        <Animated.View style={[opacityStyle]}>
                            <SwipeableDraft
                                item={item}
                                location={location}
                                layoutWidth={layoutWidth}
                            />
                        </Animated.View>
                    </Animated.View>
                </Tooltip>
            );
        }
        return (
            <SwipeableDraft
                item={item}
                location={location}
                layoutWidth={layoutWidth}
            />
        );
    }, [close, firstDraftId, isTablet, layoutWidth, location, opacityStyle, tooltipContentStyle, tooltipVisible, widthAnimatedStyle]);

    return (
        <View
            style={{flex: 1}}
            onLayout={onLayout}
            testID='global_drafts_list'
        >
            <AnimatedFlatList
                data={allDrafts}
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER + 5}
                maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                contentContainerStyle={!allDrafts.length && styles.empty}
                maxToRenderPerBatch={10}
                nativeID={location}
                renderItem={renderItem}
                ListEmptyComponent={DraftEmptyComponent}
            />
        </View>
    );
};

export default GlobalDraftsList;
