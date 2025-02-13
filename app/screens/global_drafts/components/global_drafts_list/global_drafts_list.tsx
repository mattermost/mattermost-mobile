// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {InteractionManager, StyleSheet, View, type LayoutChangeEvent, type ListRenderItemInfo} from 'react-native';
import Animated from 'react-native-reanimated';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeDraftsTutorial} from '@actions/app/global';
import {INITIAL_BATCH_TO_RENDER, SCROLL_POSITION_CONFIG} from '@components/post_list/config';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';

import DraftEmptyComponent from '../draft_empty_component';

import DraftSwipeActions from './draft_swipe_actions';
import DraftTooltip from './draft_tooltip';

import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    allDrafts: DraftModel[];
    location: string;
    tutorialWatched: boolean;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
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
    swippeableContainer: {
        width: '100%',
    },
    tooltipContentStyle: {
        borderRadius: 8,
        width: 247,
        padding: 16,
        height: 160,
    },
});

const AnimatedFlatList = Animated.FlatList;
const keyExtractor = (item: DraftModel) => item.id;

const GlobalDraftsList: React.FC<Props> = ({
    allDrafts,
    location,
    tutorialWatched,
}) => {
    const [layoutWidth, setLayoutWidth] = useState(0);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const onLayout = useCallback((e: LayoutChangeEvent) => {
        if (location === Screens.GLOBAL_DRAFTS) {
            setLayoutWidth(e.nativeEvent.layout.width - 40); // 40 is the padding of the container
        }
    }, [location]);

    const firstDraftId = allDrafts.length ? allDrafts[0].id : '';

    useEffect(() => {
        if (tutorialWatched) {
            return;
        }
        InteractionManager.runAfterInteractions(() => {
            setTooltipVisible(true);
        });

        // This effect is intended to run only on the first mount, so dependencies are omitted intentionally.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const collapse = useCallback(() => {
        popTopScreen(Screens.GLOBAL_DRAFTS);
    }, []);

    useAndroidHardwareBackHandler(Screens.GLOBAL_DRAFTS, collapse);

    const close = useCallback(() => {
        setTooltipVisible(false);
        storeDraftsTutorial();
    }, []);

    const renderItem = useCallback(({item}: ListRenderItemInfo<DraftModel>) => {
        if (item.id === firstDraftId && !tutorialWatched) {
            return (
                <Tooltip
                    isVisible={tooltipVisible}
                    useInteractionManager={true}
                    contentStyle={styles.tooltipContentStyle}
                    placement={'bottom'}
                    content={<DraftTooltip onClose={close}/>}
                    onClose={close}
                    tooltipStyle={styles.tooltipStyle}
                >
                    <View
                        style={styles.swippeableContainer}
                    >
                        <DraftSwipeActions
                            item={item}
                            location={location}
                            layoutWidth={layoutWidth}
                        />
                    </View>
                </Tooltip>
            );
        }
        return (
            <DraftSwipeActions
                item={item}
                location={location}
                layoutWidth={layoutWidth}
            />
        );
    }, [close, firstDraftId, layoutWidth, location, tooltipVisible, tutorialWatched]);

    return (
        <View
            style={styles.container}
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
