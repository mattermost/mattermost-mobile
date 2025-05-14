// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, InteractionManager, StyleSheet, View, type LayoutChangeEvent, type ListRenderItemInfo} from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeDraftsTutorial} from '@actions/app/global';
import {Screens} from '@constants';
import {DRAFT_SCHEDULED_POST_LAYOUT_PADDING, DRAFT_TYPE_DRAFT} from '@constants/draft';
import {staticStyles} from '@constants/tooltip';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import DraftTooltip from '@screens/global_drafts/draft_scheduled_post_tooltip';
import {popTopScreen} from '@screens/navigation';

import DraftAndScheduledPostSwipeActions from '../draft_and_scheduled_post_swipe_actions';
import DraftEmptyComponent from '../draft_empty_component';

import type DraftModel from '@typings/database/models/servers/draft';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    allDrafts: DraftModel[];
    location: AvailableScreens;
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
        ...staticStyles.tooltipContent,
    },
});

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
            setLayoutWidth(e.nativeEvent.layout.width - DRAFT_SCHEDULED_POST_LAYOUT_PADDING);
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
                    content={
                        <DraftTooltip
                            onClose={close}
                            draftType={DRAFT_TYPE_DRAFT}
                        />
                    }
                    onClose={close}
                    tooltipStyle={styles.tooltipStyle}
                >
                    <View
                        style={styles.swippeableContainer}
                    >
                        <DraftAndScheduledPostSwipeActions
                            draftType={DRAFT_TYPE_DRAFT}
                            item={item}
                            location={location}
                            layoutWidth={layoutWidth}
                        />
                    </View>
                </Tooltip>
            );
        }
        return (
            <DraftAndScheduledPostSwipeActions
                draftType={DRAFT_TYPE_DRAFT}
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
            <FlatList
                data={allDrafts}
                keyExtractor={keyExtractor}
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
