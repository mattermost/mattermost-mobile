// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlatList} from '@stream-io/flat-list-mvcp';
import React, {ReactElement, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, NativeScrollEvent, NativeSyntheticEvent, Platform, StyleProp, StyleSheet, ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';

import {fetchPosts, fetchPostThread} from '@actions/remote/post';
import CombinedUserActivity from '@components/post_list/combined_user_activity';
import DateSeparator from '@components/post_list/date_separator';
import NewMessagesLine from '@components/post_list/new_message_line';
import Post from '@components/post_list/post';
import ThreadOverview from '@components/post_list/thread_overview';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getDateForDateLine, isCombinedUserActivityPost, isDateLine, isStartOfNewMessages, isThreadOverview, preparePostList, START_OF_NEW_MESSAGES} from '@utils/post_list';

import {INITIAL_BATCH_TO_RENDER, SCROLL_POSITION_CONFIG, VIEWABILITY_CONFIG} from './config';
import MoreMessages from './more_messages';
import PostListRefreshControl from './refresh_control';

import type {ViewableItemsChanged, ViewableItemsChangedListenerEvent} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    channelId: string;
    contentContainerStyle?: StyleProp<ViewStyle>;
    currentTimezone: string | null;
    currentUserId: string;
    currentUsername: string;
    highlightedId?: PostModel['id'];
    highlightPinnedOrSaved?: boolean;
    isCRTEnabled?: boolean;
    isTimezoneEnabled: boolean;
    lastViewedAt: number;
    location: string;
    nativeID: string;
    onEndReached?: () => void;
    posts: PostModel[];
    rootId?: string;
    shouldRenderReplyButton?: boolean;
    shouldShowJoinLeaveMessages: boolean;
    showMoreMessages?: boolean;
    showNewMessageLine?: boolean;
    footer?: ReactElement;
    testID: string;
}

type onScrollEndIndexListenerEvent = (endIndex: number) => void;

type ScrollIndexFailed = {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const keyExtractor = (item: string | PostModel) => (typeof item === 'string' ? item : item.id);

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        scaleY: -1,
    },
    scale: {
        ...Platform.select({
            android: {
                scaleY: -1,
            },
        }),
    },
});

const PostList = ({
    channelId,
    contentContainerStyle,
    currentTimezone,
    currentUserId,
    currentUsername,
    footer,
    highlightedId,
    highlightPinnedOrSaved = true,
    isCRTEnabled,
    isTimezoneEnabled,
    lastViewedAt,
    location,
    nativeID,
    onEndReached,
    posts,
    rootId,
    shouldRenderReplyButton = true,
    shouldShowJoinLeaveMessages,
    showMoreMessages,
    showNewMessageLine = true,
    testID,
}: Props) => {
    const listRef = useRef<FlatList>(null);
    const onScrollEndIndexListener = useRef<onScrollEndIndexListenerEvent>();
    const onViewableItemsChangedListener = useRef<ViewableItemsChangedListenerEvent>();
    const scrolledToHighlighted = useRef(false);
    const [enableRefreshControl, setEnableRefreshControl] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const orderedPosts = useMemo(() => {
        return preparePostList(posts, lastViewedAt, showNewMessageLine, currentUserId, currentUsername, shouldShowJoinLeaveMessages, isTimezoneEnabled, currentTimezone, location === Screens.THREAD);
    }, [posts, lastViewedAt, showNewMessageLine, currentTimezone, currentUsername, shouldShowJoinLeaveMessages, isTimezoneEnabled, location]);

    const initialIndex = useMemo(() => {
        return orderedPosts.indexOf(START_OF_NEW_MESSAGES);
    }, [orderedPosts]);

    useEffect(() => {
        const t = setTimeout(() => {
            listRef.current?.scrollToOffset({offset: 0, animated: true});
        }, 300);

        return () => clearTimeout(t);
    }, [channelId, rootId]);

    useEffect(() => {
        const scrollToBottom = (screen: string) => {
            if (screen === location) {
                const scrollToBottomTimer = setTimeout(() => {
                    listRef.current?.scrollToOffset({offset: 0, animated: true});
                    clearTimeout(scrollToBottomTimer);
                }, 400);
            }
        };

        const scrollBottomListener = DeviceEventEmitter.addListener(Events.POST_LIST_SCROLL_TO_BOTTOM, scrollToBottom);

        return () => {
            scrollBottomListener.remove();
        };
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        if (location === Screens.CHANNEL && channelId) {
            await fetchPosts(serverUrl, channelId);
        } else if (location === Screens.THREAD && rootId) {
            await fetchPostThread(serverUrl, rootId);
        }
        setRefreshing(false);
    }, [channelId, location, rootId]);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (Platform.OS === 'android') {
            const {y} = event.nativeEvent.contentOffset;
            setEnableRefreshControl(y === 0);
        }
    }, []);

    const onScrollToIndexFailed = useCallback((info: ScrollIndexFailed) => {
        const index = Math.min(info.highestMeasuredFrameIndex, info.index);

        if (!highlightedId) {
            if (onScrollEndIndexListener.current) {
                onScrollEndIndexListener.current(index);
            }
            scrollToIndex(index);
        }
    }, [highlightedId]);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable) {
                acc[`${location}-${item.id}`] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);

        if (onViewableItemsChangedListener.current) {
            onViewableItemsChangedListener.current(viewableItems);
        }
    }, [location]);

    const registerScrollEndIndexListener = useCallback((listener) => {
        onScrollEndIndexListener.current = listener;
        const removeListener = () => {
            onScrollEndIndexListener.current = undefined;
        };

        return removeListener;
    }, []);

    const registerViewableItemsListener = useCallback((listener) => {
        onViewableItemsChangedListener.current = listener;
        const removeListener = () => {
            onViewableItemsChangedListener.current = undefined;
        };

        return removeListener;
    }, []);

    const renderItem = useCallback(({item, index}) => {
        if (typeof item === 'string') {
            if (isStartOfNewMessages(item)) {
                // postIds includes a date item after the new message indicator so 2
                // needs to be added to the index for the length check to be correct.
                const moreNewMessages = orderedPosts.length === index + 2;

                // The date line and new message line each count for a line. So the
                // goal of this is to check for the 3rd previous, which for the start
                // of a thread would be null as it doesn't exist.
                const checkForPostId = index < orderedPosts.length - 3;

                return (
                    <NewMessagesLine
                        theme={theme}
                        moreMessages={moreNewMessages && checkForPostId}
                        testID={`${testID}.new_messages_line`}
                        style={styles.scale}
                    />
                );
            } else if (isDateLine(item)) {
                return (
                    <DateSeparator
                        date={getDateForDateLine(item)}
                        theme={theme}
                        style={styles.scale}
                        timezone={isTimezoneEnabled ? currentTimezone : null}
                    />
                );
            } else if (isThreadOverview(item)) {
                return (
                    <ThreadOverview
                        rootId={rootId!}
                        testID={`${testID}.thread_overview`}
                        style={styles.scale}
                    />
                );
            }

            if (isCombinedUserActivityPost(item)) {
                const postProps = {
                    currentUsername,
                    postId: item,
                    location,
                    style: Platform.OS === 'ios' ? styles.scale : styles.container,
                    testID: `${testID}.combined_user_activity`,
                    showJoinLeave: shouldShowJoinLeaveMessages,
                    theme,
                };

                return (<CombinedUserActivity {...postProps}/>);
            }
        }

        let previousPost: PostModel|undefined;
        let nextPost: PostModel|undefined;

        const lastPosts = orderedPosts.slice(index + 1);
        const immediateLastPost = lastPosts[0];

        // Post after `Thread Overview` should show user avatar irrespective of being the consecutive post
        // So we skip sending previous post to avoid the check for consecutive post
        const skipFindingPreviousPost = (
            location === Screens.THREAD &&
            typeof immediateLastPost === 'string' &&
            isThreadOverview(immediateLastPost)
        );

        if (!skipFindingPreviousPost) {
            const prev = lastPosts.find((v) => typeof v !== 'string');
            if (prev) {
                previousPost = prev as PostModel;
            }
        }

        if (index > 0) {
            const next = orderedPosts.slice(0, index);
            for (let i = next.length - 1; i >= 0; i--) {
                const v = next[i];
                if (typeof v !== 'string') {
                    nextPost = v;
                    break;
                }
            }
        }

        // Skip rendering Flag for the root post in the thread as it is visible in the `Thread Overview`
        const skipSaveddHeader = (
            location === Screens.THREAD &&
            item.id === rootId
        );

        const postProps = {
            highlight: highlightedId === item.id,
            highlightPinnedOrSaved,
            location,
            nextPost,
            previousPost,
            shouldRenderReplyButton,
            skipSaveddHeader,
        };

        return (
            <Post
                isCRTEnabled={isCRTEnabled}
                key={item.id}
                post={item}
                style={styles.scale}
                testID={`${testID}.post`}
                {...postProps}
            />
        );
    }, [currentTimezone, highlightPinnedOrSaved, isCRTEnabled, isTimezoneEnabled, orderedPosts, shouldRenderReplyButton, theme]);

    const scrollToIndex = useCallback((index: number, animated = true, applyOffset = true) => {
        listRef.current?.scrollToIndex({
            animated,
            index,
            viewOffset: applyOffset ? Platform.select({ios: -45, default: 0}) : 0,
            viewPosition: 1, // 0 is at bottom
        });
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            if (highlightedId && orderedPosts && !scrolledToHighlighted.current) {
                scrolledToHighlighted.current = true;
                // eslint-disable-next-line max-nested-callbacks
                const index = orderedPosts.findIndex((p) => typeof p !== 'string' && p.id === highlightedId);
                if (index >= 0) {
                    scrollToIndex(index, true);
                }
            }
        }, 500);

        return () => clearTimeout(t);
    }, [orderedPosts, highlightedId]);

    return (
        <>
            <PostListRefreshControl
                enabled={enableRefreshControl}
                refreshing={refreshing}
                onRefresh={onRefresh}
                style={styles.container}
            >
                <AnimatedFlatList
                    contentContainerStyle={contentContainerStyle}
                    data={orderedPosts}
                    keyboardDismissMode='interactive'
                    keyboardShouldPersistTaps='handled'
                    keyExtractor={keyExtractor}
                    initialNumToRender={INITIAL_BATCH_TO_RENDER + 5}
                    ListFooterComponent={footer}
                    maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                    maxToRenderPerBatch={10}
                    nativeID={nativeID}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={2}
                    onScroll={onScroll}
                    onScrollToIndexFailed={onScrollToIndexFailed}
                    onViewableItemsChanged={onViewableItemsChanged}
                    ref={listRef}
                    removeClippedSubviews={true}
                    renderItem={renderItem}
                    scrollEventThrottle={60}
                    style={styles.flex}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                    testID={`${testID}.flat_list`}
                />
            </PostListRefreshControl>
            {showMoreMessages &&
            <MoreMessages
                channelId={channelId}
                newMessageLineIndex={initialIndex}
                posts={orderedPosts}
                registerScrollEndIndexListener={registerScrollEndIndexListener}
                registerViewableItemsListener={registerViewableItemsListener}
                scrollToIndex={scrollToIndex}
                theme={theme}
                testID={`${testID}.more_messages_button`}
            />
            }
        </>
    );
};

export default PostList;
