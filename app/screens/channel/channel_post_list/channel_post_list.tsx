// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useRef} from 'react';
import {StyleProp, ViewStyle} from 'react-native';

import {fetchPostsBefore} from '@actions/remote/post';
import PostList from '@components/post_list';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {debounce} from '@helpers/api/general';
import {sortPostsByNewest} from '@utils/post';

import Intro from './intro';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    channelId: string;
    contentContainerStyle?: StyleProp<ViewStyle>;
    currentTimezone: string | null;
    currentUsername: string;
    isTimezoneEnabled: boolean;
    lastViewedAt: number;
    posts: PostModel[];
    shouldShowJoinLeaveMessages: boolean;
}

const ChannelPostList = ({channelId, contentContainerStyle, currentTimezone, currentUsername, isTimezoneEnabled, lastViewedAt, posts, shouldShowJoinLeaveMessages}: Props) => {
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

    const intro = useMemo(() => (
        <Intro channelId={channelId}/>
    ), [channelId]);

    return (
        <PostList
            channelId={channelId}
            contentContainerStyle={contentContainerStyle}
            currentTimezone={currentTimezone}
            currentUsername={currentUsername}
            isTimezoneEnabled={isTimezoneEnabled}
            footer={intro}
            lastViewedAt={lastViewedAt}
            location={Screens.CHANNEL}
            nativeID={`${Screens.CHANNEL}-${channelId}`}
            onEndReached={onEndReached}
            posts={posts}
            shouldShowJoinLeaveMessages={shouldShowJoinLeaveMessages}
            showMoreMessages={true}
            testID='channel.post_list'
        />
    );
};

export default ChannelPostList;

