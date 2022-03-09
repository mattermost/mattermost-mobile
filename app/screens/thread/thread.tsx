// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import PostDraft from '@components/post_draft';
import {THREAD_ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import {useAppState} from '@hooks/device';
import {dismissModal} from '@screens/navigation';

import ThreadPostList from './thread_post_list';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

type ThreadProps = {
    channel: ChannelModel;
    componentId: string;
    rootPost: PostModel;
};

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = StyleSheet.create(() => ({
    flex: {
        flex: 1,
    },
}));

export const CLOSE_BUTTON_ID = 'close-threads';

const Thread = ({channel, componentId, rootPost}: ThreadProps) => {
    const appState = useAppState();
    const styles = getStyleSheet();

    const close = useCallback(() => {
        dismissModal({componentId});
        return true;
    }, []);

    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                switch (buttonId) {
                    case CLOSE_BUTTON_ID:
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

    return (
        <>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={edges}
            >
                {Boolean(channel?.id) &&
                <>
                    <View style={styles.flex}>
                        <ThreadPostList
                            channelId={channel.id}
                            forceQueryAfterAppState={appState}
                            nativeID={rootPost.id}
                            rootPost={rootPost}
                        />
                    </View>
                    <PostDraft
                        channelId={channel.id}
                        scrollViewNativeID={rootPost.id}
                        accessoriesContainerID={THREAD_ACCESSORIES_CONTAINER_NATIVE_ID}
                        rootId={rootPost.id}
                    />
                </>
                }
            </SafeAreaView>
        </>
    );
};

export default Thread;
