// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import CurrentCallBar from '@calls/components/current_call_bar';
import FloatingCallContainer from '@calls/components/floating_call_container';
import FreezeScreen from '@components/freeze_screen';
import PostDraft from '@components/post_draft';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Events} from '@constants';
import {THREAD_ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import {useAppState} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {popTopScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

import ThreadPostList from './thread_post_list';

import type PostModel from '@typings/database/models/servers/post';

type ThreadProps = {
    componentId: string;
    rootPost?: PostModel;
    isInACall: boolean;
};

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const Thread = ({componentId, rootPost, isInACall}: ThreadProps) => {
    const appState = useAppState();
    const postDraftRef = useRef<KeyboardTrackingViewRef>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.PAUSE_KEYBOARD_TRACKING_VIEW, (pause: boolean) => {
            if (pause) {
                postDraftRef.current?.pauseTracking(rootPost!.id);
                return;
            }

            postDraftRef.current?.resumeTracking(rootPost!.id);
        });

        return () => listener.remove();
    }, []);

    useEffect(() => {
        return () => {
            EphemeralStore.setCurrentThreadId('');
        };
    }, []);

    useDidUpdate(() => {
        if (!rootPost) {
            popTopScreen(componentId);
        }
    }, [componentId, rootPost]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

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
                {Boolean(rootPost?.id) &&
                <>
                    <View style={styles.flex}>
                        <ThreadPostList
                            forceQueryAfterAppState={appState}
                            nativeID={rootPost!.id}
                            rootPost={rootPost!}
                        />
                    </View>
                    <PostDraft
                        channelId={rootPost!.channelId}
                        scrollViewNativeID={rootPost!.id}
                        accessoriesContainerID={THREAD_ACCESSORIES_CONTAINER_NATIVE_ID}
                        rootId={rootPost!.id}
                        keyboardTracker={postDraftRef}
                        testID='thread.post_draft'
                        containerHeight={containerHeight}
                        isChannelScreen={false}
                    />
                </>
                }
                {isInACall &&
                    <FloatingCallContainer threadScreen={true}>
                        <CurrentCallBar threadScreen={true}/>
                    </FloatingCallContainer>
                }
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default Thread;
