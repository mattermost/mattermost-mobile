// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import PostList from '@components/post_list';
import {Screens} from '@constants';
import {useIsTablet} from '@hooks/device';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    channelId: string;
    currentTimezone: string | null;
    currentUsername: string;
    isTimezoneEnabled: boolean;
    lastViewedAt: number;
    nativeID: string;
    posts: PostModel[];
    rootPost: PostModel;
}

const edges: Edge[] = ['bottom'];

const styles = StyleSheet.create({
    container: {marginTop: 10},
    flex: {flex: 1},
    footer: {height: 20},
});

const ThreadPostList = ({
    channelId, currentTimezone, currentUsername,
    isTimezoneEnabled, lastViewedAt, nativeID, posts, rootPost,
}: Props) => {
    const isTablet = useIsTablet();

    const threadPosts = useMemo(() => {
        return [...posts, rootPost];
    }, [posts, rootPost]);

    const postList = (
        <PostList
            channelId={channelId}
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
