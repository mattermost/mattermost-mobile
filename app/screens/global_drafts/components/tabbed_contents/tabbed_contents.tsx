// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode, useState, useMemo, useCallback} from 'react';
import {Freeze} from 'react-freeze';
import {defineMessage} from 'react-intl';
import {StyleSheet, View, type LayoutChangeEvent} from 'react-native';
import Animated, {runOnJS, useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {DRAFT_SCREEN_TAB_DRAFTS, DRAFT_SCREEN_TAB_SCHEDULED_POSTS, type DraftScreenTab} from '@constants/draft';
import useTabs from '@hooks/use_tabs';
import Tabs from '@hooks/use_tabs/tabs';

const duration = 250;

type Props = {
    draftsCount: number;
    scheduledPostCount: number;
    initialTab: DraftScreenTab;
    drafts: ReactNode;
    scheduledPosts: ReactNode;
}

const getStyleSheet = (width: number) => {
    return StyleSheet.create({
        tabContainer: {
            height: '100%',
        },
        tabContentContainer: {
            flex: 1,
            flexDirection: 'row',
            overflow: 'hidden',
        },
        tabContent: {
            width,
            height: '100%',
            position: 'absolute',
        },
    });
};

export default function TabbedContents({draftsCount, scheduledPostCount, initialTab, drafts, scheduledPosts}: Props) {
    const onSelectTab = useCallback((tab: DraftScreenTab) => {
        if (tab === DRAFT_SCREEN_TAB_DRAFTS) {
            setFreezeDraft(false);
        } else {
            setFreezeScheduledPosts(false);
        }
    }, []);
    const [selectedTab, tabProps] = useTabs(initialTab, [
        {
            id: DRAFT_SCREEN_TAB_DRAFTS,
            name: defineMessage({id: 'drafts_tab.title.drafts', defaultMessage: 'Drafts'}),
            count: draftsCount,
        },
        {
            id: DRAFT_SCREEN_TAB_SCHEDULED_POSTS,
            name: defineMessage({id: 'drafts_tab.title.scheduled', defaultMessage: 'Scheduled'}),
            count: scheduledPostCount,
        },
    ], onSelectTab);
    const [freezeDraft, setFreezeDraft] = useState(initialTab !== DRAFT_SCREEN_TAB_DRAFTS);
    const [freezeScheduledPosts, setFreezeScheduledPosts] = useState(initialTab !== DRAFT_SCREEN_TAB_SCHEDULED_POSTS);
    const [width, setWidth] = useState(0);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const newWidth = e.nativeEvent.layout.width;
        if (newWidth !== width) {
            setWidth(newWidth);
        }
    }, [width]);
    const styles = useMemo(() => getStyleSheet(width), [width]);

    const firstTabStyle = useAnimatedStyle(() => ({
        transform: [{translateX: withTiming(selectedTab === DRAFT_SCREEN_TAB_DRAFTS ? 0 : -width, {duration}, (finished) => {
            if (finished && selectedTab === DRAFT_SCREEN_TAB_DRAFTS && !freezeScheduledPosts) {
                runOnJS(setFreezeScheduledPosts)(true);
            }
        })}],
        zIndex: 1,
    }));

    const secondTabStyle = useAnimatedStyle(() => ({
        transform: [{translateX: withTiming(selectedTab === DRAFT_SCREEN_TAB_SCHEDULED_POSTS ? 0 : width, {duration}, (finished) => {
            if (finished && selectedTab === DRAFT_SCREEN_TAB_SCHEDULED_POSTS && !freezeDraft) {
                runOnJS(setFreezeDraft)(true);
            }
        })}],
        zIndex: 0,
    }));

    return (
        <View
            style={styles.tabContainer}
            onLayout={onLayout}
            testID='tabbed_contents'
        >
            <View>
                <Tabs {...tabProps}/>
            </View>
            <Animated.View style={[styles.tabContentContainer]}>
                <Animated.View
                    style={[firstTabStyle, styles.tabContent]}
                    testID='draft_list_container'
                >
                    <Freeze freeze={freezeDraft}>
                        {drafts}
                    </Freeze>
                </Animated.View>

                <Animated.View
                    style={[secondTabStyle, styles.tabContent]}
                    testID='scheduled_posts_list_container'
                >
                    <Freeze freeze={freezeScheduledPosts}>
                        {scheduledPosts}
                    </Freeze>
                </Animated.View>
            </Animated.View>
        </View>
    );
}
