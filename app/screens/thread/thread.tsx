// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, View} from 'react-native';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchPostThread} from '@actions/remote/post';
import {useServerUrl} from '@app/context/server';
import NavigationHeader from '@components/navigation_header';
import PostDraft from '@components/post_draft';
import {General} from '@constants';
import {ACCESSORIES_CONTAINER_NATIVE_ID} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {useAppState, useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {popTopScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ThreadPostList from './thread_post_list';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

type ThreadProps = {
    channel: ChannelModel;
    componentId?: string;
    rootPost: PostModel;
};

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    flex: {
        flex: 1,
    },
}));

const Thread = ({channel, componentId, rootPost}: ThreadProps) => {
    const {formatMessage} = useIntl();
    const appState = useAppState();
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const defaultHeight = useDefaultHeaderHeight();

    // Get post thread
    useEffect(() => {
        fetchPostThread(serverUrl, rootPost.id);
    }, []);

    const onBackPress = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen(componentId);
    }, []);

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

    const marginTop = defaultHeight + (isTablet ? insets.top : 0);
    const channelIsSet = Boolean(channel?.id);

    return (
        <>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={edges}
            >
                <NavigationHeader
                    isLargeTitle={false}
                    onBackPress={onBackPress}
                    showBackButton={!isTablet}
                    subtitle={subtitle}
                    title={title}
                />
                {channelIsSet &&
                <>
                    <View style={[styles.flex, {marginTop}]}>
                        <ThreadPostList
                            channelId={channel.id}
                            forceQueryAfterAppState={appState}
                            nativeID={rootPost.id}
                            rootPost={rootPost}
                        />
                    </View>
                    <PostDraft
                        channelId={channel.id}
                        scrollViewNativeID={channel.id}
                        accessoriesContainerID={ACCESSORIES_CONTAINER_NATIVE_ID}
                        rootId={rootPost.id}
                    />
                </>
                }
            </SafeAreaView>
        </>
    );
};

export default Thread;
