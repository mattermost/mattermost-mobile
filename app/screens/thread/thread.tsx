// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useState} from 'react';
import {type LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {storeLastViewedThreadIdAndServer, removeLastViewedThreadIdAndServer} from '@actions/app/global';
import FloatingCallContainer from '@calls/components/floating_call_container';
import PostDraft from '@components/post_draft';
import RoundedHeaderContext from '@components/rounded_header_context';
import ScheduledPostIndicator from '@components/scheduled_post_indicator';
import {Screens} from '@constants';
import {ExtraKeyboardProvider} from '@context/extra_keyboard';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';

import ThreadFollowButton from './thread_follow_button';
import ThreadPostList from './thread_post_list';

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

const edges: Edge[] = ['left', 'right'];

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
            edges={edges}
            testID='thread.screen'
            onLayout={onLayout}
        >
            <RoundedHeaderContext/>
            {Boolean(rootPost) &&
                <ExtraKeyboardProvider>
                    <View style={styles.flex}>
                        <ThreadPostList
                            nativeID={rootId}
                            rootPost={rootPost!}
                        />
                    </View>
                    <>
                        {scheduledPostCount > 0 &&
                            <ScheduledPostIndicator
                                isThread={true}
                                scheduledPostCount={scheduledPostCount}
                            />
                        }
                    </>
                    <PostDraft
                        channelId={rootPost!.channelId}
                        rootId={rootId}
                        testID='thread.post_draft'
                        containerHeight={containerHeight}
                        isChannelScreen={false}
                        location={Screens.THREAD}
                    />
                </ExtraKeyboardProvider>
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
    );
};

export default Thread;
