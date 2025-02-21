// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {View, type LayoutChangeEvent, InteractionManager, type ListRenderItemInfo, Text} from 'react-native';
import Animated from 'react-native-reanimated';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeScheduledPostsTutorial} from '@actions/app/global';
import CompassIcon from '@components/compass_icon';
import {INITIAL_BATCH_TO_RENDER, SCROLL_POSITION_CONFIG} from '@components/post_list/config';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {DRAFT_TYPE_SCHEDULED} from '@screens/global_drafts/constants';
import DraftTooltip from '@screens/global_drafts/draft_scheduled_post_tooltip';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import DraftAndScheduledPostSwipeActions from '../draft_and_scheduled_post_swipe_actions';
import DraftEmptyComponent from '../draft_empty_component';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

type Props = {
    allScheduledPosts: ScheduledPostModel[];
    location: string;
    tutorialWatched: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
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
        errorContainer: {
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.errorTextColor, 0.08),
            padding: 16,
        },
        errorText: {
            ...typography('Body', 100, 'SemiBold'),
            color: theme.centerChannelColor,
        },
    };
});

const AnimatedFlatList = Animated.FlatList;
const keyExtractor = (item: ScheduledPostModel) => item.id;

const GlobalScheduledPostList: React.FC<Props> = ({
    allScheduledPosts,
    location,
    tutorialWatched,
}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [layoutWidth, setLayoutWidth] = useState(0);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const onLayout = useCallback((e: LayoutChangeEvent) => {
        if (location === Screens.GLOBAL_DRAFTS) {
            setLayoutWidth(e.nativeEvent.layout.width - 40); // 40 is the padding of the container
        }
    }, [location]);

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

    const firstScheduledPostId = allScheduledPosts.length ? allScheduledPosts[0].id : '';

    const isErrorInScheduledPosts = allScheduledPosts.some((post) => post.errorCode !== '');

    const collapse = useCallback(() => {
        popTopScreen(Screens.GLOBAL_DRAFTS);
    }, []);

    useAndroidHardwareBackHandler(Screens.GLOBAL_DRAFTS, collapse);

    const close = useCallback(() => {
        setTooltipVisible(false);
        storeScheduledPostsTutorial();
    }, []);

    const renderItem = useCallback(({item}: ListRenderItemInfo<ScheduledPostModel>) => {
        if (item.id === firstScheduledPostId && !tutorialWatched) {
            return (
                <Tooltip
                    isVisible={tooltipVisible}
                    useInteractionManager={true}
                    contentStyle={styles.tooltipContentStyle}
                    placement={'bottom'}
                    content={
                        <DraftTooltip
                            onClose={close}
                            draftType={DRAFT_TYPE_SCHEDULED}
                        />
                    }
                    onClose={close}
                    tooltipStyle={styles.tooltipStyle}
                >
                    <View
                        style={styles.swippeableContainer}
                    >
                        <DraftAndScheduledPostSwipeActions
                            draftType={DRAFT_TYPE_SCHEDULED}
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
                draftType={DRAFT_TYPE_SCHEDULED}
                item={item}
                location={location}
                layoutWidth={layoutWidth}
            />
        );
    }, [close, firstScheduledPostId, layoutWidth, location, styles.swippeableContainer, styles.tooltipContentStyle, styles.tooltipStyle, tooltipVisible, tutorialWatched]);

    return (
        <View
            style={styles.container}
            onLayout={onLayout}
            testID='global_scheduled_post_list'
        >
            {isErrorInScheduledPosts &&
                <View style={styles.errorContainer}>
                    <CompassIcon
                        name='alert-outline'
                        size={24}
                        color={theme.errorTextColor}
                    />
                    <Text style={styles.errorText}>{'Error in scheduled posts'}</Text>
                </View>
            }
            <AnimatedFlatList
                data={allScheduledPosts}
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER + 5}
                maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                contentContainerStyle={!allScheduledPosts.length && styles.empty}
                maxToRenderPerBatch={10}
                nativeID={location}
                renderItem={renderItem}
                ListEmptyComponent={DraftEmptyComponent} //TODO: Change this to ScheduledPostEmptyComponent
            />
        </View>
    );
};

export default GlobalScheduledPostList;
