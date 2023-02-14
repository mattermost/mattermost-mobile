// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import CurrentCallBar from '@calls/components/current_call_bar';
import FloatingCallContainer from '@calls/components/floating_call_container';
import FreezeScreen from '@components/freeze_screen';
import PostDraft from '@components/post_draft';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {THREAD_ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import {useKeyboardTrackingPaused} from '@hooks/keyboard_tracking';
import {popTopScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

import ThreadPostList from './thread_post_list';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';
import type {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';

type ThreadProps = {
    componentId: AvailableScreens;
    rootPost?: PostModel;
    isInACall: boolean;
};

const edges: Edge[] = ['left', 'right'];
const trackKeyboardForScreens = [Screens.THREAD];

const styles = StyleSheet.create({
    flex: {flex: 1},
});

const Thread = ({componentId, rootPost, isInACall}: ThreadProps) => {
    const postDraftRef = useRef<KeyboardTrackingViewRef>(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const rootId = rootPost?.id || '';

    const close = () => {
        popTopScreen(componentId);
    };

    useKeyboardTrackingPaused(postDraftRef, rootId, trackKeyboardForScreens);
    useAndroidHardwareBackHandler(componentId, close);

    useEffect(() => {
        return () => {
            EphemeralStore.setCurrentThreadId('');
        };
    }, []);

    useDidUpdate(() => {
        if (!rootPost) {
            close();
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
