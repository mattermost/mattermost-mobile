// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {BackHandler, StyleSheet, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {fetchPostThread} from '@actions/remote/post';
import {useServerUrl} from '@app/context/server';
import {useTheme} from '@app/context/theme';
import {changeOpacity} from '@app/utils/theme';
import CompassIcon from '@components/compass_icon';
import PostDraft from '@components/post_draft';
import {General} from '@constants';
import {THREAD_ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import {useAppState, useIsTablet} from '@hooks/device';
import {dismissModal, mergeNavigationOptions} from '@screens/navigation';

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

const CLOSE_BUTTON_ID = 'close-threads';

const Thread = ({channel, componentId, rootPost}: ThreadProps) => {
    const {formatMessage} = useIntl();
    const appState = useAppState();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet();
    const theme = useTheme();

    // Get post thread
    useEffect(() => {
        fetchPostThread(serverUrl, rootPost.id);
    }, []);

    const close = useCallback(() => {
        dismissModal({componentId});
        return true;
    }, []);

    const leftButton = useMemo(() => {
        return {
            id: CLOSE_BUTTON_ID,
            icon: CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor),
            testID: CLOSE_BUTTON_ID,
        };
    }, [isTablet, theme.centerChannelColor]);

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

    useEffect(() => {
        let title;
        if (channel?.type === General.DM_CHANNEL) {
            title = formatMessage({id: 'thread.header.thread_dm', defaultMessage: 'Direct Message Thread'});
        } else {
            title = formatMessage({id: 'thread.header.thread', defaultMessage: 'Thread'});
        }

        let subtitle = '';
        if (channel?.type !== General.DM_CHANNEL) {
            subtitle = formatMessage({id: 'thread.header.thread_in', defaultMessage: 'in {channelName}'}, {channelName: channel?.displayName});
        }

        mergeNavigationOptions(componentId, {
            topBar: {
                leftButtons: [leftButton!],
                title: {
                    fontFamily: 'OpenSans-SemiBold',
                    fontSize: 18,
                    text: title,
                },
                subtitle: {
                    color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
                    text: subtitle,
                },
            },
        });
    }, [componentId, leftButton, theme]);

    const channelIsSet = Boolean(channel?.id);

    return (
        <>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={edges}
            >
                {channelIsSet &&
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
