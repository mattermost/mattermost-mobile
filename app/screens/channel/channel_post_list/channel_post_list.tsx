// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {type StyleProp, StyleSheet, type ViewStyle, type ViewToken, DeviceEventEmitter} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {markChannelAsRead, unsetActiveChannelOnServer} from '@actions/remote/channel';
import {fetchPosts, fetchPostsBefore} from '@actions/remote/post';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import PostList from '@components/post_list';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useAppState, useIsTablet} from '@hooks/device';
import useDidMount from '@hooks/did_mount';
import useDidUpdate from '@hooks/did_update';
import {useDebounce} from '@hooks/utils';
import EphemeralStore from '@store/ephemeral_store';

import Intro from './intro';

import type PostModel from '@typings/database/models/servers/post';
import type {AnimatedStyle} from 'react-native-reanimated';

type Props = {
    channelId: string;
    contentContainerStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
    isCRTEnabled: boolean;
    lastViewedAt: number;
    posts: PostModel[];
    shouldShowJoinLeaveMessages: boolean;
}

const edges: Edge[] = [];
const styles = StyleSheet.create({
    flex: {flex: 1},
    containerStyle: {paddingTop: 12},
});

const ChannelPostList = ({
    channelId, contentContainerStyle, isCRTEnabled,
    lastViewedAt, posts, shouldShowJoinLeaveMessages,
}: Props) => {
    const appState = useAppState();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const canLoadPostsBefore = useRef(true);
    const canLoadPost = useRef(true);
    const [fetchingPosts, setFetchingPosts] = useState(EphemeralStore.isLoadingMessagesForChannel(serverUrl, channelId));
    const oldPostsCount = useRef<number>(posts.length);

    const handleEndReached = useCallback(async () => {
        if (!fetchingPosts && canLoadPostsBefore.current && posts.length) {
            const lastPost = posts[posts.length - 1];
            const result = await fetchPostsBefore(serverUrl, channelId, lastPost?.id || '');
            canLoadPostsBefore.current = false;
            if (!('error' in result)) {
                canLoadPostsBefore.current = (result.posts?.length ?? 0) > 0;
            }
        }
    }, [fetchingPosts, serverUrl, channelId, posts]);

    const onEndReached = useDebounce(handleEndReached, 500);

    useDidUpdate(() => {
        setFetchingPosts(EphemeralStore.isLoadingMessagesForChannel(serverUrl, channelId));
    }, [serverUrl, channelId]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.LOADING_CHANNEL_POSTS, ({serverUrl: eventServerUrl, channelId: eventChannelId, value}) => {
            if (eventServerUrl === serverUrl && eventChannelId === channelId) {
                setFetchingPosts(value);
            }
        });

        return () => listener.remove();
    }, [serverUrl, channelId]);

    useEffect(() => {
        // If we have too few posts so the onEndReached may have been called while fetching
        // we call fetchPosts to make sure we have at least the latest page of posts
        if (!fetchingPosts && canLoadPost.current && posts.length < PER_PAGE_DEFAULT) {
            // We do this just once
            canLoadPost.current = false;
            fetchPosts(serverUrl, channelId);
        }

        // We only want to run this when the number of posts changes or we stop fetching posts
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchingPosts, posts]);

    useDidUpdate(() => {
        if (posts.length < oldPostsCount.current) {
            // Cache cleanup evicted posts — allow paginating older posts again.
            canLoadPostsBefore.current = true;
        } else if (posts.length > oldPostsCount.current && appState === 'active') {
            markChannelAsRead(serverUrl, channelId, true);
        }
        oldPostsCount.current = posts.length;
    }, [posts.length]);

    useDidUpdate(() => {
        if (appState === 'active') {
            markChannelAsRead(serverUrl, channelId, true);
        }
        if (appState !== 'active') {
            unsetActiveChannelOnServer(serverUrl);
        }
    }, [appState === 'active']);

    useDidMount(() => {
        return () => {
            // Clear the viewport anchor when leaving the channel so a stale value
            // cannot influence a cleanup run that fires before the next channel is opened.
            EphemeralStore.setCurrentChannelOldestVisibleCreateAt(undefined);
            unsetActiveChannelOnServer(serverUrl);
        };
    });

    const onViewablePostsChanged = useCallback((viewableItems: ViewToken[]) => {
        let oldest = Infinity;
        for (const {item, isViewable} of viewableItems) {
            if (isViewable && item.type === 'post') {
                const createAt = item.value.currentPost.createAt;
                if (createAt < oldest) {
                    oldest = createAt;
                }
            }
        }
        if (oldest < Infinity) {
            EphemeralStore.setCurrentChannelOldestVisibleCreateAt(oldest);
        }
    }, []);

    const intro = useMemo(() => (<Intro channelId={channelId}/>), [channelId]);

    const postList = (
        <PostList
            channelId={channelId}
            contentContainerStyle={[contentContainerStyle, !isCRTEnabled && styles.containerStyle]}
            isCRTEnabled={isCRTEnabled}
            footer={intro}
            lastViewedAt={lastViewedAt}
            location={Screens.CHANNEL}
            onEndReached={onEndReached}
            onViewableItemsChanged={onViewablePostsChanged}
            posts={posts}
            shouldShowJoinLeaveMessages={shouldShowJoinLeaveMessages}
            showMoreMessages={true}
            testID='channel.post_list'
        />
    );

    if (isTablet) {
        return postList;
    }

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
        >
            {postList}
        </SafeAreaView>
    );
};

export default ChannelPostList;
