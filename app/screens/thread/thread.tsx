// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {BackHandler, LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import PostDraft from '@components/post_draft';
import {THREAD_ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import {PostInputTopProvider} from '@context/post_input_top';
import {useAppState} from '@hooks/device';
import {dismissModal} from '@screens/navigation';

import ThreadPostList from './thread_post_list';

import type PostModel from '@typings/database/models/servers/post';

type ThreadProps = {
    closeButtonId: string;
    componentId: string;
    rootPost?: PostModel;
};

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = StyleSheet.create(() => ({
    flex: {
        flex: 1,
    },
}));

const Thread = ({closeButtonId, componentId, rootPost}: ThreadProps) => {
    const appState = useAppState();
    const styles = getStyleSheet();
    const postDraftRef = useRef<KeyboardTrackingViewRef>(null);

    const [postInputTop, setPostInputTop] = useState(0);

    const close = useCallback(() => {
        dismissModal({componentId});
        return true;
    }, []);

    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                switch (buttonId) {
                    case closeButtonId:
                        close();
                        break;
                }
            },
        }, componentId);

        return () => {
            unsubscribe.remove();
        };
    }, []);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', close);
        return () => {
            backHandler.remove();
        };
    }, []);

    const onLayout = useCallback((layoutEvent: LayoutChangeEvent) => {
        const {layout} = layoutEvent.nativeEvent;
        setPostInputTop(layout.y);
    }, []);

    return (
        <>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={edges}
            >
                {Boolean(rootPost?.id) &&
                <>
                    <View style={styles.flex}>
                        <PostInputTopProvider postInputTop={postInputTop}>
                            <ThreadPostList
                                channelId={rootPost!.channelId}
                                forceQueryAfterAppState={appState}
                                nativeID={rootPost!.id}
                                rootPost={rootPost!}
                            />
                        </PostInputTopProvider>
                    </View>
                    <View onLayout={onLayout}>
                        <PostDraft
                            channelId={rootPost!.channelId}
                            scrollViewNativeID={rootPost!.id}
                            accessoriesContainerID={THREAD_ACCESSORIES_CONTAINER_NATIVE_ID}
                            rootId={rootPost!.id}
                            keyboardTracker={postDraftRef}
                        />
                    </View>

                </>
                }
            </SafeAreaView>
        </>
    );
};

export default Thread;
