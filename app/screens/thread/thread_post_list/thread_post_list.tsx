// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateThreadRead} from '@actions/remote/thread';
import PostList from '@components/post_list';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    currentTimezone: string | null;
    currentUsername: string;
    isCRTEnabled: boolean;
    isTimezoneEnabled: boolean;
    lastViewedAt: number;
    nativeID: string;
    posts: PostModel[];
    rootPost: PostModel;
    teamId: string;
}

const edges: Edge[] = ['bottom'];

const styles = StyleSheet.create({
    container: {marginTop: 10},
    flex: {flex: 1},
    footer: {height: 20},
});

const ThreadPostList = ({
    currentTimezone, currentUsername,
    isCRTEnabled, isTimezoneEnabled, lastViewedAt, nativeID, posts, rootPost, teamId,
}: Props) => {
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();

    const threadPosts = useMemo(() => {
        return [...posts, rootPost];
    }, [posts, rootPost]);

    // If CRT is enabled, When new post arrives and thread modal is open, mark thread as read
    const oldPostsCount = useRef<number>(posts.length);
    useEffect(() => {
        if (isCRTEnabled && oldPostsCount.current < posts.length) {
            oldPostsCount.current = posts.length;
            updateThreadRead(serverUrl, teamId, rootPost.id, Date.now());
        }
    }, [isCRTEnabled, posts, rootPost, serverUrl, teamId]);

    const postList = (
        <PostList
            channelId={rootPost.channelId}
            contentContainerStyle={styles.container}
            currentTimezone={currentTimezone}
            currentUsername={currentUsername}
            isTimezoneEnabled={isTimezoneEnabled}
            lastViewedAt={lastViewedAt}
            location={Screens.THREAD}
            nativeID={nativeID}
            posts={threadPosts}
            rootId={rootPost.id}
            shouldShowJoinLeaveMessages={false}
            showMoreMessages={false}
            showNewMessageLine={false}
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
