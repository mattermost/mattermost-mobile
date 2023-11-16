// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {uniqueId} from 'lodash';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {type LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {storeLastViewedThreadIdAndServer, removeLastViewedThreadIdAndServer} from '@actions/app/global';
import FloatingCallContainer from '@calls/components/floating_call_container';
import FreezeScreen from '@components/freeze_screen';
import PostDraft from '@components/post_draft';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {THREAD_ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import {useKeyboardTrackingPaused} from '@hooks/keyboard_tracking';
import {popTopScreen, setButtons} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';

import ThreadPostList from './thread_post_list';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';
import type {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';

type ThreadProps = {
    componentId: AvailableScreens;
    isCRTEnabled: boolean;
    showJoinCallBanner: boolean;
    isInACall: boolean;
    showIncomingCalls: boolean;
    rootId: string;
    rootPost?: PostModel;
};

const edges: Edge[] = ['left', 'right'];
const trackKeyboardForScreens = [Screens.THREAD];

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
}: ThreadProps) => {
    const postDraftRef = useRef<KeyboardTrackingViewRef>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useKeyboardTrackingPaused(postDraftRef, rootId, trackKeyboardForScreens);
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
    }, [rootId]);

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
                edges={edges}
                testID='thread.screen'
                onLayout={onLayout}
            >
                <RoundedHeaderContext/>
                {Boolean(rootPost) &&
                <>
                    <View style={styles.flex}>
                        <ThreadPostList
                            nativeID={rootId}
                            rootPost={rootPost!}
                        />
                    </View>
                    <PostDraft
                        channelId={rootPost!.channelId}
                        scrollViewNativeID={rootId}
                        accessoriesContainerID={THREAD_ACCESSORIES_CONTAINER_NATIVE_ID}
                        rootId={rootId}
                        keyboardTracker={postDraftRef}
                        testID='thread.post_draft'
                        containerHeight={containerHeight}
                        isChannelScreen={false}
                    />
                </>
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
