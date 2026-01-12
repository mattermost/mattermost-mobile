// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactElement, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, Platform, type StyleProp, StyleSheet, type ViewStyle, type NativeSyntheticEvent, type NativeScrollEvent, type ViewToken, FlatList, type ListRenderItemInfo} from 'react-native';
import {type AnimatedStyle} from 'react-native-reanimated';

import {removePost} from '@actions/local/post';
import {fetchPosts, fetchPostThread} from '@actions/remote/post';
import CombinedUserActivity from '@components/post_list/combined_user_activity';
import DateSeparator from '@components/post_list/date_separator';
import NewMessagesLine from '@components/post_list/new_message_line';
import Post from '@components/post_list/post';
import ThreadOverview from '@components/post_list/thread_overview';
import {Events, Screens} from '@constants';
import {PostTypes} from '@constants/post';
import {PostConfigProvider} from '@context/post_config';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import PostListPerformance from '@utils/performance/post_list_performance';
import {getDateForDateLine, preparePostList} from '@utils/post_list';
import {getTimezone} from '@utils/user';

import {INITIAL_BATCH_TO_RENDER, SCROLL_POSITION_CONFIG} from './config';
import MoreMessages from './more_messages';
import ScrollToEndView from './scroll_to_end_view';

import type {PostListItem, PostListOtherItem, ViewableItemsChanged, ViewableItemsChangedListenerEvent} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    appsEnabled: boolean;
    channelId: string;
    contentContainerStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
    currentUser: UserModel;
    customEmojiNames: string[];
    disablePullToRefresh?: boolean;
    highlightedId?: PostModel['id'];
    highlightPinnedOrSaved?: boolean;
    isCRTEnabled?: boolean;
    isPostAcknowledgementEnabled?: boolean;
    lastViewedAt: number;
    location: AvailableScreens;
    nativeID: string;
    onEndReached?: () => void;
    posts: PostModel[];
    rootId?: string;
    shouldRenderReplyButton?: boolean;
    shouldShowJoinLeaveMessages: boolean;
    showMoreMessages?: boolean;
    showNewMessageLine?: boolean;
    footer?: ReactElement;
    header?: ReactElement;
    testID: string;
    currentCallBarVisible?: boolean;
    savedPostIds: Set<string>;
}

type onScrollEndIndexListenerEvent = (endIndex: number) => void;

type ScrollIndexFailed = {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
};

const CONTENT_OFFSET_THRESHOLD = 160;

export const keyExtractor = (item: PostListItem | PostListOtherItem) => (item.type === 'post' ? item.value.currentPost.id : item.value);

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
});

const PostList = ({
    appsEnabled,
    channelId,
    currentUser,
    customEmojiNames,
    disablePullToRefresh,
    footer,
    header,
    highlightedId,
    highlightPinnedOrSaved = true,
    isCRTEnabled,
    isPostAcknowledgementEnabled,
    lastViewedAt,
    location,
    onEndReached,
    posts,
    rootId,
    shouldRenderReplyButton = true,
    shouldShowJoinLeaveMessages,
    showMoreMessages,
    showNewMessageLine = true,
    testID,
    savedPostIds,
}: Props) => {
    const firstIdInPosts = posts[0]?.id;

    // Derive values from currentUser
    const currentUserId = currentUser.id;
    const currentUsername = currentUser.username;
    const currentTimezone = useMemo(() => getTimezone(currentUser.timezone), [currentUser.timezone]);

    const listRef = useRef<FlatList<PostListItem | PostListOtherItem>>(null);
    const onScrollEndIndexListener = useRef<onScrollEndIndexListenerEvent>();
    const onViewableItemsChangedListener = useRef<ViewableItemsChangedListenerEvent>();
    const scrolledToHighlighted = useRef(false);
    const initialRenderTracked = useRef(false);
    const viewableItemsDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showScrollToEndBtn, setShowScrollToEndBtn] = useState(false);
    const [lastPostId, setLastPostId] = useState<string | undefined>(() => firstIdInPosts);
    const theme = useTheme();
    const serverUrl = useServerUrl();

    // Progressive loading: start with 10 items, then add the rest after initial render
    // The remaining posts are loaded in trackInitialRenderMetrics when viewable items are detected
    const [showAllPosts, setShowAllPosts] = useState(false);

    const {orderedPosts, initialIndex} = useMemo(() => {
        const result = preparePostList(posts, lastViewedAt, showNewMessageLine, currentUserId, currentUsername, shouldShowJoinLeaveMessages, currentTimezone, location === Screens.THREAD, savedPostIds);
        const unreadIndex = result.findIndex((i) => i.type === 'start-of-new-messages');

        let postsToShow = result;
        if (!showAllPosts) {
            postsToShow = result.slice(0, INITIAL_BATCH_TO_RENDER);
        }

        return {
            orderedPosts: postsToShow,
            initialIndex: unreadIndex,
        };
    }, [posts, lastViewedAt, showNewMessageLine, currentUserId, currentUsername, shouldShowJoinLeaveMessages, currentTimezone, location, savedPostIds, showAllPosts]);

    const isNewMessage = lastPostId ? firstIdInPosts !== lastPostId : false;

    const scrollToEnd = useCallback(() => {
        listRef.current?.scrollToOffset({offset: 0, animated: true});
    }, []);

    useEffect(() => {
        const scrollToBottom = (screen: string) => {
            if (screen === location) {
                const scrollToBottomTimer = setTimeout(() => {
                    scrollToEnd();
                    clearTimeout(scrollToBottomTimer);
                }, 400);
            }
        };

        const scrollBottomListener = DeviceEventEmitter.addListener(Events.POST_LIST_SCROLL_TO_BOTTOM, scrollToBottom);

        return () => {
            scrollBottomListener.remove();
        };
    }, [location, scrollToEnd]);

    // Performance tracking: Start ONLY when channel/thread changes (not on post updates)
    useEffect(() => {
        // Start tracking for this NEW channel/thread
        PostListPerformance.startInitialRender(channelId, rootId, posts.length);
        initialRenderTracked.current = false;

        // Reset showAllPosts when channel/thread changes to enable progressive loading for new channel
        setShowAllPosts(false);

        return () => {
            // Print summary when switching away from this channel/thread
            PostListPerformance.printSummary(channelId, rootId);
            PostListPerformance.clearMetrics(channelId, rootId);
        };

        // ONLY channelId and rootId - NOT posts.length!
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelId, rootId]);

    const onRefresh = useCallback(async () => {
        if (disablePullToRefresh) {
            return;
        }
        setRefreshing(true);
        if (location === Screens.CHANNEL && channelId) {
            await fetchPosts(serverUrl, channelId);
        } else if (location === Screens.THREAD && rootId) {
            const options: FetchPaginatedThreadOptions = {};
            const lastPost = posts[0];
            if (lastPost) {
                options.fromCreateAt = lastPost.createAt;
                options.fromPost = lastPost.id;
                options.direction = 'down';
            }
            await fetchPostThread(serverUrl, rootId, options);
        }
        const removalPromises = posts.
            filter((post) => post.type === PostTypes.EPHEMERAL).
            map((post) => removePost(serverUrl, post));
        await Promise.all(removalPromises);
        setRefreshing(false);
    }, [disablePullToRefresh, location, channelId, rootId, posts, serverUrl]);

    const scrollToIndex = useCallback((index: number, animated = true, applyOffset = true) => {
        listRef.current?.scrollToIndex({
            animated,
            index,
            viewOffset: applyOffset ? Platform.select({ios: -45, default: 0}) : 0,
            viewPosition: 1, // 0 is at bottom
        });
    }, []);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const {y} = event.nativeEvent.contentOffset;
        const isThresholdReached = y > CONTENT_OFFSET_THRESHOLD;

        if (isThresholdReached !== showScrollToEndBtn) {
            setShowScrollToEndBtn(isThresholdReached);
        }

        if (!y && lastPostId !== firstIdInPosts) {
            setLastPostId(firstIdInPosts);
        }
    }, [firstIdInPosts, lastPostId, showScrollToEndBtn]);

    const onScrollToIndexFailed = useCallback((info: ScrollIndexFailed) => {
        const index = Math.min(info.highestMeasuredFrameIndex, info.index);

        if (!highlightedId) {
            if (onScrollEndIndexListener.current) {
                onScrollEndIndexListener.current(index);
            }
            scrollToIndex(index);
        }
    }, [highlightedId, scrollToIndex]);

    const trackInitialRenderMetrics = useCallback((viewableItems: ViewToken[]) => {
        if (initialRenderTracked.current) {
            return; // Already tracked
        }

        // Count posts that are viewable in viewport (excludes date separators, etc.)
        const viewablePostCount = viewableItems.filter((viewToken) => {
            const item = viewToken.item as PostListItem | PostListOtherItem;
            return item.type === 'post' || item.type === 'user-activity';
        }).length;

        // Only track when we actually have viewable posts
        if (viewablePostCount > 0 || viewableItems.length === 0) {
            initialRenderTracked.current = true;

            // initialNumToRender is how many items FlatList actually renders initially
            const initialNumRendered = INITIAL_BATCH_TO_RENDER; // 10 items as per config

            PostListPerformance.endInitialRender(channelId, rootId, initialNumRendered, viewablePostCount);

            // Progressive loading: Now that initial render is complete and tracked, load remaining posts
            if (!showAllPosts) {
                setShowAllPosts(true);
            }
        }
    }, [channelId, rootId, showAllPosts]);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        // Performance tracking: End initial render when posts become viewable
        // Debounce to wait for viewable items to stabilize (FlatList renders in batches)
        if (!initialRenderTracked.current && viewableItems.length > 0) {
            // Clear any existing timer
            if (viewableItemsDebounceTimer.current) {
                clearTimeout(viewableItemsDebounceTimer.current);
            }

            // Set a timer to track metrics after viewable items stabilize
            viewableItemsDebounceTimer.current = setTimeout(() => {
                trackInitialRenderMetrics(viewableItems);
            }, 250); // 250ms debounce
        }

        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable && item.type === 'post') {
                acc[`${location}-${item.value.currentPost.id}`] = true;
            }
            return acc;
        }, {});

        requestAnimationFrame(() => {
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);
        });

        if (onViewableItemsChangedListener.current) {
            onViewableItemsChangedListener.current(viewableItems);
        }
    }, [location, trackInitialRenderMetrics]);

    const registerScrollEndIndexListener = useCallback((listener: onScrollEndIndexListenerEvent) => {
        onScrollEndIndexListener.current = listener;
        const removeListener = () => {
            onScrollEndIndexListener.current = undefined;
        };

        return removeListener;
    }, []);

    const registerViewableItemsListener = useCallback((listener: ViewableItemsChangedListenerEvent) => {
        onViewableItemsChangedListener.current = listener;
        const removeListener = () => {
            onViewableItemsChangedListener.current = undefined;
        };

        return removeListener;
    }, []);

    const renderItem = useCallback(({item}: ListRenderItemInfo<PostListItem | PostListOtherItem>) => {
        switch (item.type) {
            case 'start-of-new-messages':
                return (
                    <NewMessagesLine
                        key={item.value}
                        theme={theme}
                        testID={`${testID}.new_messages_line`}
                    />
                );
            case 'date':
                return (
                    <DateSeparator
                        key={item.value}
                        date={getDateForDateLine(item.value)}
                        timezone={currentTimezone}
                    />
                );
            case 'thread-overview':
                return (
                    <ThreadOverview
                        key={item.value}
                        rootId={rootId!}
                        testID={`${testID}.thread_overview`}
                    />
                );
            case 'user-activity': {
                const postProps = {
                    currentUsername,
                    postId: item.value,
                    location,
                    style: styles.container,
                    testID: `${testID}.combined_user_activity`,
                    showJoinLeave: shouldShowJoinLeaveMessages,
                    theme,
                };

                return (
                    <CombinedUserActivity
                        {...postProps}
                        key={item.value}
                    />);
            }
            default: {
                const post = item.value.currentPost;
                const {isSaved, nextPost, previousPost} = item.value;
                const skipSavedHeader = (location === Screens.THREAD && post.id === rootId);
                const postProps = {
                    appsEnabled,
                    currentUser,
                    customEmojiNames,
                    isCRTEnabled,
                    isPostAcknowledgementEnabled,
                    highlight: highlightedId === post.id,
                    highlightPinnedOrSaved,
                    isSaved,
                    location,
                    nextPost,
                    post,
                    previousPost,
                    rootId,
                    shouldRenderReplyButton,
                    skipSavedHeader,
                    testID: `${testID}.post`,
                };

                return (
                    <Post
                        {...postProps}
                        key={post.id}
                    />
                );
            }
        }
    }, [
        appsEnabled, currentUser, currentTimezone, currentUsername,
        customEmojiNames, highlightPinnedOrSaved, highlightedId,
        isCRTEnabled, isPostAcknowledgementEnabled, location, rootId,
        shouldRenderReplyButton, shouldShowJoinLeaveMessages, testID, theme,
    ]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (highlightedId && orderedPosts && !scrolledToHighlighted.current) {
                scrolledToHighlighted.current = true;
                // eslint-disable-next-line max-nested-callbacks
                const index = orderedPosts.findIndex((p) => p.type === 'post' && p.value.currentPost.id === highlightedId);
                if (index >= 0 && listRef.current) {
                    listRef.current?.scrollToIndex({
                        animated: true,
                        index,
                        viewOffset: 0,
                        viewPosition: 0.5, // 0 is at bottom
                    });
                }
            }
        }, 500);

        return () => clearTimeout(t);
    }, [orderedPosts, highlightedId]);

    return (
        <>
            <PostConfigProvider>
                <FlatList
                    data={orderedPosts}
                    keyboardDismissMode='interactive'
                    keyboardShouldPersistTaps='handled'
                    keyExtractor={keyExtractor}
                    initialNumToRender={INITIAL_BATCH_TO_RENDER}
                    maxToRenderPerBatch={5}
                    updateCellsBatchingPeriod={100}
                    ListHeaderComponent={header}
                    ListFooterComponent={footer}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.9}
                    onScroll={onScroll}
                    onScrollToIndexFailed={onScrollToIndexFailed}
                    onViewableItemsChanged={onViewableItemsChanged}
                    ref={listRef}
                    renderItem={renderItem}
                    testID={`${testID}.flat_list`}
                    inverted={true}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                    removeClippedSubviews={true}
                    windowSize={10}
                />
            </PostConfigProvider>
            {location !== Screens.PERMALINK &&
            <ScrollToEndView
                onPress={scrollToEnd}
                isNewMessage={isNewMessage}
                showScrollToEndBtn={showScrollToEndBtn}
                location={location}
                testID={'scroll-to-end-view'}
            />
            }
            {showMoreMessages &&
            <MoreMessages
                channelId={channelId}
                isCRTEnabled={isCRTEnabled}
                newMessageLineIndex={initialIndex}
                posts={orderedPosts}
                registerScrollEndIndexListener={registerScrollEndIndexListener}
                registerViewableItemsListener={registerViewableItemsListener}
                rootId={rootId}
                scrollToIndex={scrollToIndex}
                theme={theme}
                testID={`${testID}.more_messages_button`}
            />
            }
        </>
    );
};

export default PostList;
