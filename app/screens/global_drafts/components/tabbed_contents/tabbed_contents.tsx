// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode, useState, useMemo, useCallback} from 'react';
import {Freeze} from 'react-freeze';
import {StyleSheet, View, type LayoutChangeEvent} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';

import {DRAFT_SCREEN_TAB_DRAFTS, DRAFT_SCREEN_TAB_SCHEDULED_POSTS, type DraftScreenTab} from '@screens/global_drafts';
import {DraftTabsHeader} from '@screens/global_drafts/components/tabbed_contents/draftTabsHeader';

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
        },
        tabContent: {
            width,
        },
        hiddenTabContent: {
            opacity: 0,
        },
    });
};

export default function TabbedContents({draftsCount, scheduledPostCount, initialTab, drafts, scheduledPosts}: Props) {
    const [selectedTab, setSelectedTab] = useState(initialTab);
    const [width, setWidth] = useState(0);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setWidth(e.nativeEvent.layout.width);
    }, []);
    const styles = useMemo(() => getStyleSheet(width), [width]);

    const transform = useAnimatedStyle(() => {
        const translateX = selectedTab === DRAFT_SCREEN_TAB_DRAFTS ? 0 : -width;
        return {
            transform: [
                {translateX: withTiming(translateX, {duration})},
            ],
        };
    }, [selectedTab, width]);

    return (
        <View
            style={styles.tabContainer}
            onLayout={onLayout}
        >
            <DraftTabsHeader
                draftsCount={draftsCount}
                scheduledPostCount={scheduledPostCount}
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
            />

            <Animated.View style={[styles.tabContentContainer, transform]}>
                <View
                    style={[styles.tabContent, selectedTab !== DRAFT_SCREEN_TAB_DRAFTS && styles.hiddenTabContent]}
                    testID='draft_list_container'
                >
                    <Freeze freeze={selectedTab !== DRAFT_SCREEN_TAB_DRAFTS}>
                        {drafts}
                    </Freeze>
                </View>

                <View
                    style={[styles.tabContent, selectedTab !== DRAFT_SCREEN_TAB_SCHEDULED_POSTS && styles.hiddenTabContent]}
                    testID='scheduled_posts_list_container'
                >
                    <Freeze freeze={selectedTab !== DRAFT_SCREEN_TAB_SCHEDULED_POSTS}>
                        {scheduledPosts}
                    </Freeze>
                </View>
            </Animated.View>
        </View>
    );
}
