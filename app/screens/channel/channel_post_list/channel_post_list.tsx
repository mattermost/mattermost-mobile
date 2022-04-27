// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {StyleProp, StyleSheet, ViewStyle} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {fetchPostsBefore} from '@actions/remote/post';
import PostList from '@components/post_list';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {debounce} from '@helpers/api/general';
import {useIsTablet} from '@hooks/device';
import {sortPostsByNewest} from '@utils/post';

import Intro from './intro';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    channelId: string;
    contentContainerStyle?: StyleProp<ViewStyle>;
    currentTimezone: string | null;
    currentUsername: string;
    isCRTEnabled: boolean;
    isTimezoneEnabled: boolean;
    lastViewedAt: number;
    nativeID: string;
    posts: PostModel[];
    shouldShowJoinLeaveMessages: boolean;
}

const edges: Edge[] = ['bottom'];
const styles = StyleSheet.create({
    flex: {flex: 1},
});

const ChannelPostList = ({
    channelId, contentContainerStyle, currentTimezone, currentUsername,
    isCRTEnabled, isTimezoneEnabled, lastViewedAt, nativeID, posts, shouldShowJoinLeaveMessages,
}: Props) => {
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const canLoadPosts = useRef(true);
    const fetchingPosts = useRef(false);

    const onEndReached = useCallback(debounce(async () => {
        if (!fetchingPosts.current && canLoadPosts.current && posts.length) {
            fetchingPosts.current = true;
            const lastPost = sortPostsByNewest(posts)[0];
            const result = await fetchPostsBefore(serverUrl, channelId, lastPost.id);
            canLoadPosts.current = ((result as ProcessedPosts).posts?.length ?? 1) > 0;
            fetchingPosts.current = false;
        }
    }, 500), [channelId, posts]);

    const intro = <Intro channelId={channelId}/>;

    const postList = (
        <PostList
            channelId={channelId}
            contentContainerStyle={contentContainerStyle}
            currentTimezone={currentTimezone}
            currentUsername={currentUsername}
            isCRTEnabled={isCRTEnabled}
            isTimezoneEnabled={isTimezoneEnabled}
            footer={intro}
            lastViewedAt={lastViewedAt}
            location={Screens.CHANNEL}
            nativeID={nativeID}
            onEndReached={onEndReached}
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
