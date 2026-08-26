// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {type StyleProp, StyleSheet, type ViewStyle, DeviceEventEmitter} from 'react-native';
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
import {NavigationStore} from '@store/navigation_store';

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
    lastPostAt: number;
}

const edges: Edge[] = [];
const styles = StyleSheet.create({
    flex: {flex: 1},
    containerStyle: {paddingTop: 12},
});

const ChannelPostList = ({
    channelId, contentContainerStyle, isCRTEnabled,
    lastPostAt, lastViewedAt, posts, shouldShowJoinLeaveMessages,
}: Props) => {
    const appState = useAppState();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const canLoadPostsBefore = useRef(true);
    const canLoadPost = useRef(true);
    const [fetchingPosts, setFetchingPosts] = useState(EphemeralStore.isLoadingMessagesForChannel(serverUrl, channelId));

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

    // Marking the channel read is driven by what the user has actually seen, not by the posts having
    // been fetched. Telling the server resets the membership counters irreversibly, so a fetch that
    // silently failed must not be able to clear unreads for messages that never made it to the
    // client. The new messages separator coming into view is that signal, and the boundary it refers
    // to is identified by lastViewedAt so that later ones are reported too.
    const boundaryKey = `${channelId}-${lastViewedAt}`;
    const markedBoundary = useRef<string | undefined>(undefined);
    const markingBoundary = useRef<string | undefined>(undefined);

    // Viewability is layout based and the channel stays mounted underneath threads and modals, so a
    // separator can be reported while the user is looking at something else. On a tablet the channel
    // lives inside the home screen rather than being the visible one.
    const isChannelVisible = useCallback(() => {
        const visibleScreen = NavigationStore.getVisibleScreen();
        return visibleScreen === Screens.CHANNEL || (isTablet && visibleScreen === Screens.HOME);
    }, [isTablet]);

    const markAsRead = useCallback(async (key: string) => {
        if (markedBoundary.current === key || markingBoundary.current === key) {
            return;
        }

        // Only remember the boundary once the server accepted it, otherwise a failed request would
        // never be retried for a separator that is still on screen.
        markingBoundary.current = key;
        const {error} = await markChannelAsRead(serverUrl, channelId, true);
        markingBoundary.current = undefined;
        if (!error) {
            markedBoundary.current = key;
        }
    }, [channelId, serverUrl]);

    const onNewMessageLineViewed = useCallback(() => {
        if (appState !== 'active' || !isChannelVisible()) {
            return;
        }

        markAsRead(boundaryKey);
    }, [appState, boundaryKey, isChannelVisible, markAsRead]);

    // With nothing newer than what the user has already seen there is no separator to wait for and
    // nothing to lose, so view the channel right away. That keeps it registered as the active channel
    // on the server, which is what suppresses its push notifications while the user is reading.
    //
    // This compares timestamps rather than asking whether the channel is unread, because the unread
    // flag and the message count are both cleared locally and optimistically before this screen
    // mounts: switchToChannel calls markChannelAsViewed on every open, and resetMessageCount zeroes
    // the count when the more messages button is dismissed. Either would make every channel look
    // already read and send the read unconditionally. lastPostAt comes from the server's channel
    // record, so it still describes messages we failed to fetch, and viewedAt is the boundary the
    // separator is drawn from; together they say whether anything is left to see.
    const hasUnseenPosts = lastPostAt > lastViewedAt;
    useEffect(() => {
        if (!hasUnseenPosts && appState === 'active') {
            markChannelAsRead(serverUrl, channelId, true);
        }
    }, [hasUnseenPosts, appState, channelId, serverUrl]);

    useDidUpdate(() => {
        if (appState !== 'active') {
            unsetActiveChannelOnServer(serverUrl);
            return;
        }

        // Coming back from background is not evidence the channel was read. If the user had already
        // reached this boundary, view it again so the channel is registered as active on the server;
        // otherwise re-arm and wait for the separator to be reported once more.
        if (markedBoundary.current === boundaryKey) {
            markChannelAsRead(serverUrl, channelId, true);
        } else {
            markedBoundary.current = undefined;
        }
    }, [appState === 'active']);

    useDidMount(() => {
        return () => {
            unsetActiveChannelOnServer(serverUrl);
        };
    });

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
            onNewMessageLineViewed={onNewMessageLineViewed}
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
