// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, type LayoutChangeEvent, InteractionManager, type ListRenderItemInfo, Text, FlatList} from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';

import {storeScheduledPostsListTutorial} from '@actions/app/global';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {DRAFT_SCHEDULED_POST_LAYOUT_PADDING, DRAFT_TYPE_SCHEDULED} from '@constants/draft';
import {staticStyles} from '@constants/tooltip';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import DraftTooltip from '@screens/global_drafts/draft_scheduled_post_tooltip';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import DraftAndScheduledPostSwipeActions from '../draft_and_scheduled_post_swipe_actions';
import ScheduledPostEmptyComponent from '../scheduled_post_empty_component';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    allScheduledPosts: ScheduledPostModel[];
    location: AvailableScreens;
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
        errorContainer: {
            display: 'flex',
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.errorTextColor, 0.08),
            paddingHorizontal: 16,
            height: 50,
        },
        errorText: {
            ...typography('Body', 100, 'SemiBold'),
            color: theme.centerChannelColor,
        },
    };
});

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
        setLayoutWidth(e.nativeEvent.layout.width - DRAFT_SCHEDULED_POST_LAYOUT_PADDING);
    }, []);

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

    const firstScheduledPostId = allScheduledPosts[0]?.id || '';

    const isErrorInScheduledPosts = useMemo(() => {
        return allScheduledPosts.some((post) => post.errorCode !== '');
    }, [allScheduledPosts]);

    const scheduledPostsInSequence = allScheduledPosts.filter((post) => post.errorCode === '');
    if (isErrorInScheduledPosts) {
        scheduledPostsInSequence.unshift(...allScheduledPosts.filter((post) => post.errorCode !== ''));
    }

    const collapse = useCallback(() => {
        popTopScreen(Screens.GLOBAL_DRAFTS);
    }, []);

    useAndroidHardwareBackHandler(Screens.GLOBAL_DRAFTS, collapse);

    const closeTooltip = useCallback(() => {
        setTooltipVisible(false);
        storeScheduledPostsListTutorial();
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
                            onClose={closeTooltip}
                            draftType={DRAFT_TYPE_SCHEDULED}
                        />
                    }
                    onClose={closeTooltip}
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
                            firstItem={item.id === firstScheduledPostId}
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
                firstItem={item.id === firstScheduledPostId}
            />
        );
    }, [closeTooltip, firstScheduledPostId, layoutWidth, location, styles.swippeableContainer, styles.tooltipContentStyle, styles.tooltipStyle, tooltipVisible, tutorialWatched]);

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
            <FlatList
                data={scheduledPostsInSequence}
                keyExtractor={keyExtractor}
                contentContainerStyle={!scheduledPostsInSequence.length && styles.empty}
                maxToRenderPerBatch={10}
                nativeID={location}
                renderItem={renderItem}
                ListEmptyComponent={ScheduledPostEmptyComponent}
            />
        </View>
    );
};

export default GlobalScheduledPostList;
