// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';

import {fetchPostThread} from '@actions/remote/post';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import PostList from '@components/post_list';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useFetchingThreadState} from '@hooks/fetching_thread';
import {useDebounce} from '@hooks/utils';
import {logDebug} from '@utils/log';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    rootPost?: PostModel;
    posts: PostModel[];
    channelLastViewedAt: number;
};

const styles = StyleSheet.create({
    container: {marginTop: 10},
    footer: {height: 20},
});

// Renders the active agent conversation inline (rooted at the user's first
// message), reusing the shared PostList so agent posts, streaming, tool
// approvals, reasoning and citations all render exactly as elsewhere. An agent
// conversation is a DM thread, so this mirrors ThreadPostList minus the CRT
// machinery (agent DMs are not collapsed-reply threads).
const AgentChatPostList = ({rootPost, posts, channelLastViewedAt}: Props) => {
    const serverUrl = useServerUrl();
    const isFetchingThread = useFetchingThreadState(rootPost?.id ?? '');

    const canLoadMorePosts = useRef(true);
    const onEndReached = useDebounce(useCallback(async () => {
        if (!rootPost || isFetchingThread || !canLoadMorePosts.current || !posts.length) {
            logDebug('[AgentChatPostList.onEndReached] skipping pagination', {hasRootPost: Boolean(rootPost), isFetchingThread, canLoadMore: canLoadMorePosts.current, postCount: posts.length});
            return;
        }
        const options: FetchPaginatedThreadOptions = {perPage: PER_PAGE_DEFAULT};
        const lastPost = posts[posts.length - 1];
        if (lastPost) {
            options.fromPost = lastPost.id;
            options.fromCreateAt = lastPost.createAt;
        }
        const result = await fetchPostThread(serverUrl, rootPost.id, options);

        // Only adjust the flag on a successful fetch — a transient error must
        // not permanently disable pagination. The root post is always fetched,
        // so a full page would include +1.
        if (!result?.error) {
            canLoadMorePosts.current = (result?.posts?.length || 0) > PER_PAGE_DEFAULT;
        }
    }, [rootPost, isFetchingThread, posts, serverUrl]), 500);

    const threadPosts = useMemo(() => (rootPost ? [...posts, rootPost] : []), [posts, rootPost]);

    if (!rootPost) {
        return null;
    }

    return (
        <PostList
            channelId={rootPost.channelId}
            contentContainerStyle={styles.container}
            disablePullToRefresh={isFetchingThread}
            isCRTEnabled={false}
            lastViewedAt={channelLastViewedAt}
            location={Screens.AGENT_CHAT}
            onEndReached={onEndReached}
            posts={threadPosts}
            rootId={rootPost.id}
            shouldShowJoinLeaveMessages={false}
            footer={<View style={styles.footer}/>}
            testID='agent_chat.post_list'
        />
    );
};

export default AgentChatPostList;
