// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {uniqueId} from 'lodash';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, type LayoutChangeEvent, StyleSheet} from 'react-native';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {storeLastViewedThreadIdAndServer, removeLastViewedThreadIdAndServer} from '@actions/app/global';
import FloatingCallContainer from '@calls/components/floating_call_container';
import FreezeScreen from '@components/freeze_screen';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {useIsScreenVisible} from '@hooks/use_screen_visibility';
import SecurityManager from '@managers/security_manager';
import {popTopScreen, setButtons} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';

import ThreadContent from './thread_content';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type ThreadProps = {
    componentId: AvailableScreens;
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
    componentId,
    isCRTEnabled,
    rootId,
    rootPost,
    showJoinCallBanner,
    isInACall,
    showIncomingCalls,
    scheduledPostCount,
}: ThreadProps) => {
    const [containerHeight, setContainerHeight] = useState(0);
    const isVisible = useIsScreenVisible(componentId);
    const isTablet = useIsTablet();
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = useState(false);

    // Remove bottom safe area when emoji search is focused to eliminate gap between emoji picker and keyboard
    const safeAreaViewEdges: Edge[] = useMemo(() => {
        if (isTablet) {
            return ['left', 'right'];
        }
        if (isEmojiSearchFocused) {
            return ['left', 'right'];
        }
        return ['left', 'right', 'bottom'];
    }, [isTablet, isEmojiSearchFocused]);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        if (isCRTEnabled && rootId) {
            const id = `${componentId}-${rootId}-${uniqueId()}`;
            const name = Screens.THREAD_FOLLOW_BUTTON;
            setButtons(componentId, {rightButtons: [{
                id,
                component: {
                    name,
                    passProps: {
                        threadId: rootId,
                    },
                },
            }]});
        } else {
            setButtons(componentId, {rightButtons: []});
        }
    }, [componentId, rootId, isCRTEnabled]);

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
            setButtons(componentId, {rightButtons: []});
        };
    }, [rootId, componentId, isCRTEnabled]);

    useDidUpdate(() => {
        if (!rootPost) {
            close();
        }
    }, [componentId, rootPost]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const showFloatingCallContainer = showJoinCallBanner || isInACall || showIncomingCalls;

    return (
        <FreezeScreen>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={safeAreaViewEdges}
                testID='thread.screen'
                onLayout={onLayout}
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
                <RoundedHeaderContext/>
                {Boolean(rootPost) &&
                (Platform.OS === 'ios' ? (
                    <KeyboardProvider>
                        <ThreadContent
                            rootId={rootId}
                            rootPost={rootPost!}
                            scheduledPostCount={scheduledPostCount}
                            containerHeight={containerHeight}
                            enabled={isVisible}
                            onEmojiSearchFocusChange={setIsEmojiSearchFocused}
                        />
                    </KeyboardProvider>
                ) : (
                    <ThreadContent
                        rootId={rootId}
                        rootPost={rootPost!}
                        scheduledPostCount={scheduledPostCount}
                        containerHeight={containerHeight}
                        enabled={isVisible}
                        onEmojiSearchFocusChange={setIsEmojiSearchFocused}
                    />
                ))
                }
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
        </FreezeScreen>
    );
};

export default Thread;
