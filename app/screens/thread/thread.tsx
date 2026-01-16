// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused} from '@react-navigation/native';
import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {type LayoutChangeEvent, StyleSheet} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {storeLastViewedThreadIdAndServer, removeLastViewedThreadIdAndServer} from '@actions/app/global';
import FloatingCallContainer from '@calls/components/floating_call_container';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';

import ThreadContent from './thread_content';
import ThreadFollowButton from './thread_follow_button';

import type PostModel from '@typings/database/models/servers/post';

type ThreadProps = {
    isCRTEnabled: boolean;
    showJoinCallBanner: boolean;
    isInACall: boolean;
    showIncomingCalls: boolean;
    rootId: string;
    rootPost?: PostModel;
    scheduledPostCount: number;
};

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const Thread = ({
    isCRTEnabled,
    rootId,
    rootPost,
    showJoinCallBanner,
    isInACall,
    showIncomingCalls,
    scheduledPostCount,
}: ThreadProps) => {
    const [containerHeight, setContainerHeight] = useState(0);
    const navigation = useNavigation();
    const isVisible = useIsFocused();
    const isTablet = useIsTablet();
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = useState(false);

    // Remove bottom safe area when emoji search is focused OR keyboard is open (Android 30+ only)
    // This prevents gap between input and keyboard on Android edge-to-edge
    const safeAreaViewEdges: Edge[] = useMemo(() => {
        if (isTablet) {
            return ['left', 'right'];
        }
        if (isEmojiSearchFocused) {
            return ['left', 'right'];
        }

        return ['left', 'right', 'bottom'];
    }, [isTablet, isEmojiSearchFocused]);

    useAndroidHardwareBackHandler(Screens.THREAD, navigation.goBack);

    useEffect(() => {
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
    }, [rootId, isCRTEnabled, navigation]);

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
            navigation.setOptions({
                headerRight: undefined,
            });
        };
    }, [isCRTEnabled, navigation, rootId]);

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
            style={styles.flex}
            mode='margin'
            edges={safeAreaViewEdges}
            testID='thread.screen'
            onLayout={onLayout}
        >
            <RoundedHeaderContext/>
            {Boolean(rootPost) && (
                <ThreadContent
                    rootId={rootId}
                    rootPost={rootPost!}
                    scheduledPostCount={scheduledPostCount}
                    containerHeight={containerHeight}
                    enabled={isVisible}
                    onEmojiSearchFocusChange={setIsEmojiSearchFocused}
                />
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
