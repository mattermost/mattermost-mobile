// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {KeyboardTrackingViewRef} from 'react-native-keyboard-tracking-view';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import PostDraft from '@components/post_draft';
import {THREAD_ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import {useAppState} from '@hooks/device';

import ThreadPostList from './thread_post_list';

import type PostModel from '@typings/database/models/servers/post';

type ThreadProps = {
    rootPost?: PostModel;
};

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = StyleSheet.create(() => ({
    flex: {
        flex: 1,
    },
}));

const Thread = ({rootPost}: ThreadProps) => {
    const appState = useAppState();
    const styles = getStyleSheet();
    const postDraftRef = useRef<KeyboardTrackingViewRef>(null);

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
                    />
                </>
                }
            </SafeAreaView>
        </>
    );
};

export default Thread;
