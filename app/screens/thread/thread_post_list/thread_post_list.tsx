// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {fetchPostThread} from '@actions/remote/post';
import {markThreadAsRead} from '@actions/remote/thread';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import PostList from '@components/post_list';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {debounce} from '@helpers/api/general';
import {useIsTablet} from '@hooks/device';
import {isMinimumServerVersion} from '@utils/helpers';
import {useFetchThreadState} from '@utils/thread/fetch_thread_state';

import type PostModel from '@typings/database/models/servers/post';
import type ThreadModel from '@typings/database/models/servers/thread';

type Props = {
    channelLastViewedAt: number;
    isCRTEnabled: boolean;
    nativeID: string;
    posts: PostModel[];
    rootPost: PostModel;
    teamId: string;
    thread?: ThreadModel;
    version?: string;
}

const edges: Edge[] = ['bottom'];

const styles = StyleSheet.create({
    container: {marginTop: 10},
    flex: {flex: 1},
    footer: {height: 20},
});

const ThreadPostList = ({
    channelLastViewedAt, isCRTEnabled,
    nativeID, posts, rootPost, teamId, thread, version,
}: Props) => {
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const fetchThreadState = useFetchThreadState();

    const canLoadMorePosts = useRef(true);
    const fetchingPosts = useRef(false);
    const onEndReached = useCallback(debounce(async () => {
        if (isMinimumServerVersion(version || '', 6, 7) && !fetchingPosts.current && canLoadMorePosts.current && posts.length) {
            fetchingPosts.current = true;
            const options: FetchPaginatedThreadOptions = {
                perPage: PER_PAGE_DEFAULT,
            };
            const lastPost = posts[posts.length - 1];
            if (lastPost) {
                options.fromPost = lastPost.id;
                options.fromCreateAt = lastPost.createAt;
            }
            const result = await fetchPostThread(serverUrl, rootPost.id, options);
            fetchingPosts.current = false;

            // Root post is always fetched, so the result would include +1
            canLoadMorePosts.current = (result?.posts?.length || 0) >= PER_PAGE_DEFAULT;
        } else {
            canLoadMorePosts.current = false;
        }
    }, 500), [rootPost, posts, version]);

    const threadPosts = useMemo(() => {
        return [...posts, rootPost];
    }, [posts, rootPost]);

    // If CRT is enabled, mark the thread as read on mount.
    useEffect(() => {
        if (isCRTEnabled && thread?.isFollowing) {
            markThreadAsRead(serverUrl, teamId, rootPost.id);
        }
    }, []);

    // If CRT is enabled, When new post arrives and thread modal is open, mark thread as read.
    const oldPostsCount = useRef<number>(posts.length);
    useEffect(() => {
        if (isCRTEnabled && thread?.isFollowing && oldPostsCount.current < posts.length) {
            oldPostsCount.current = posts.length;
            markThreadAsRead(serverUrl, teamId, rootPost.id);
        }
    }, [isCRTEnabled, posts, rootPost, serverUrl, teamId, thread]);

    const lastViewedAt = isCRTEnabled ? (thread?.viewedAt ?? 0) : channelLastViewedAt;

    let header;
    if (fetchThreadState[rootPost.id] && threadPosts.length === 1) {
        header = <ActivityIndicator color={theme.centerChannelColor}/>;
    }

    const postList = (
        <PostList
            channelId={rootPost.channelId}
            contentContainerStyle={styles.container}
            isCRTEnabled={isCRTEnabled}
            lastViewedAt={lastViewedAt}
            location={Screens.THREAD}
            nativeID={nativeID}
            onEndReached={onEndReached}
            posts={threadPosts}
            rootId={rootPost.id}
            shouldShowJoinLeaveMessages={false}
            showMoreMessages={isCRTEnabled}
            header={header}
            footer={<View style={styles.footer}/>}
            testID='thread.post_list'
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

export default ThreadPostList;
