// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused} from '@react-navigation/native';
import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {type LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {storeLastViewedThreadIdAndServer, removeLastViewedThreadIdAndServer} from '@actions/app/global';
import FloatingCallContainer from '@calls/components/floating_call_container';
import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {isPlatformUiIos} from '@constants/platform_ui';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useEnsureHiddenScrollEdgeEffects} from '@hooks/hide_scroll_edge_effects';
import {useSheetStyle} from '@hooks/sheet_style';
import {navigateBack} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';

import ThreadContent from './thread_content';
import ThreadFollowButton from './thread_follow_button';

import type PostModel from '@typings/database/models/servers/post';

type ThreadProps = {
    isCRTEnabled: boolean;
    includeChannelBanner: boolean;
    showJoinCallBanner: boolean;
    isInACall: boolean;
    showIncomingCalls: boolean;
    rootId: string;
    rootPost?: PostModel;
    scheduledPostCount: number;
    title?: string;
    subtitle?: string;
};

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const Thread = ({
    isCRTEnabled,
    includeChannelBanner,
    rootId,
    rootPost,
    showJoinCallBanner,
    isInACall,
    showIncomingCalls,
    scheduledPostCount,
    title,
    subtitle,
}: ThreadProps) => {
    const [containerHeight, setContainerHeight] = useState(0);
    const navigation = useNavigation();
    const isVisible = useIsFocused();
    const theme = useTheme();
    const platformUi = isPlatformUiIos();
    const defaultHeight = useDefaultHeaderHeight();
    const shouldRenderContent = Boolean(rootPost);

    // Holds the sheet shape until rootPost resolves so the push doesn't pop the sheet in.
    const sheetPlaceholderStyle = useSheetStyle(platformUi ? defaultHeight : 0);

    useEnsureHiddenScrollEdgeEffects(platformUi, shouldRenderContent);

    const safeAreaViewEdges: Edge[] = useMemo(() => {
        if (platformUi) {
            return ['left', 'right'];
        }
        return ['left', 'right', 'bottom'];
    }, [platformUi]);

    useAndroidHardwareBackHandler(Screens.THREAD, navigation.goBack);

    useEffect(() => {
        if (platformUi) {
            return undefined;
        }

        if (isCRTEnabled && rootId) {
            navigation.setOptions({
                headerRight: () => (
                    <ThreadFollowButton threadId={rootId}/>
                ),
            });
        } else {
            navigation.setOptions({
                headerRight: undefined,
            });
        }

        return undefined;
    }, [rootId, isCRTEnabled, navigation, platformUi]);

    useEffect(() => {
        // when opened from notification, first screen in stack is HOME
        // if last screen was global thread or thread opened from notification, store the last viewed thread id
        const isFromGlobalOrNotification = NavigationStore.getScreensInStack()[1] === Screens.GLOBAL_THREADS || NavigationStore.getScreensInStack()[1] === Screens.HOME;
        if (isCRTEnabled && isFromGlobalOrNotification) {
            storeLastViewedThreadIdAndServer(rootId);
        }

        return () => {
            if (isCRTEnabled) {
                removeLastViewedThreadIdAndServer();
            }
            if (rootId === EphemeralStore.getCurrentThreadId()) {
                EphemeralStore.setCurrentThreadId('');
            }
            if (!platformUi) {
                navigation.setOptions({
                    headerRight: undefined,
                });
            }
        };
    }, [isCRTEnabled, navigation, platformUi, rootId]);

    useDidUpdate(() => {
        if (!rootPost) {
            navigation.goBack();
        }
    }, [rootPost]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const showFloatingCallContainer = showJoinCallBanner || isInACall || showIncomingCalls;

    return (
        <SafeAreaView
            style={[styles.flex, platformUi && {backgroundColor: theme.sidebarBg}]}
            edges={safeAreaViewEdges}
            testID='thread.screen'
            onLayout={onLayout}
        >
            {/* Before header chrome: RNScreens finds FlatList via first-child chain. */}
            {shouldRenderContent ? (
                <ThreadContent
                    rootId={rootId}
                    rootPost={rootPost!}
                    scheduledPostCount={scheduledPostCount}
                    containerHeight={containerHeight}
                    enabled={isVisible}
                    includeChannelBanner={includeChannelBanner}
                    marginTop={platformUi ? defaultHeight : 0}
                />
            ) : platformUi && <View style={sheetPlaceholderStyle}/>}
            {platformUi ? (
                <NavigationHeader
                    isLargeTitle={false}
                    onBackPress={navigateBack}
                    rightComponent={isCRTEnabled ? <ThreadFollowButton threadId={rootId}/> : undefined}
                    showBackButton={true}
                    subtitle={subtitle}
                    title={title}
                />
            ) : (
                <RoundedHeaderContext/>
            )}
            {showFloatingCallContainer &&
            <FloatingCallContainer
                channelId={rootPost!.channelId}
                showJoinCallBanner={showJoinCallBanner}
                showIncomingCalls={showIncomingCalls}
                isInACall={isInACall}
                threadScreen={true}
            />
            }
        </SafeAreaView>
    );
};

export default Thread;
