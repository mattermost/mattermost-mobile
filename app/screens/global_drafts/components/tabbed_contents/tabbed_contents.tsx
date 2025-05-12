// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode, useState, useMemo, useCallback} from 'react';
import {Freeze} from 'react-freeze';
import {StyleSheet, View, type LayoutChangeEvent} from 'react-native';
import Animated, {runOnJS, useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {DRAFT_SCREEN_TAB_DRAFTS, DRAFT_SCREEN_TAB_SCHEDULED_POSTS, type DraftScreenTab} from '@constants/draft';
import {DraftTabsHeader} from '@screens/global_drafts/components/tabbed_contents/draft_tabs_header';

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
    const [selectedTab, setSelectedTab] = useState(initialTab);
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

    const onSelectTab = useCallback((tab: DraftScreenTab) => {
        setSelectedTab(tab);
        if (tab === DRAFT_SCREEN_TAB_DRAFTS) {
            setFreezeDraft(false);
        } else {
            setFreezeScheduledPosts(false);
        }
    }, []);

    return (
        <View
            style={styles.tabContainer}
            onLayout={onLayout}
            testID='tabbed_contents'
        >
            <DraftTabsHeader
                draftsCount={draftsCount}
                scheduledPostCount={scheduledPostCount}
                selectedTab={selectedTab}
                onTabChange={onSelectTab}
            />

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
