// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlatList} from '@stream-io/flat-list-mvcp';
import React, {type ReactElement, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, type ListRenderItemInfo, Platform, type StyleProp, StyleSheet, type ViewStyle, type NativeSyntheticEvent, type NativeScrollEvent} from 'react-native';
import {KeyboardController, useKeyboardState} from 'react-native-keyboard-controller';
import Animated, {KeyboardState, runOnJS, useAnimatedProps, useAnimatedReaction, useSharedValue, type AnimatedStyle} from 'react-native-reanimated';

import {removePost} from '@actions/local/post';
import {fetchPosts, fetchPostThread} from '@actions/remote/post';
import CombinedUserActivity from '@components/post_list/combined_user_activity';
import DateSeparator from '@components/post_list/date_separator';
import NewMessagesLine from '@components/post_list/new_message_line';
import Post from '@components/post_list/post';
import ThreadOverview from '@components/post_list/thread_overview';
import {Events, Screens} from '@constants';
import {PostTypes} from '@constants/post';
import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getDateForDateLine, preparePostList} from '@utils/post_list';

import {INITIAL_BATCH_TO_RENDER, SCROLL_POSITION_CONFIG, VIEWABILITY_CONFIG} from './config';
import MoreMessages from './more_messages';
import ScrollToEndView from './scroll_to_end_view';

import type {PostListItem, PostListOtherItem, ViewableItemsChanged, ViewableItemsChangedListenerEvent} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    appsEnabled: boolean;
    channelId: string;
    contentContainerStyle?: StyleProp<AnimatedStyle<ViewStyle>>;
    currentTimezone: string | null;
    currentUserId: string;
    currentUsername: string;
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
    listRef?: React.RefObject<FlatList<string | PostModel>>;
}

type onScrollEndIndexListenerEvent = (endIndex: number) => void;

type ScrollIndexFailed = {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
};

const CONTENT_OFFSET_THRESHOLD = 160;
const SCROLL_EVENT_THROTTLE = Platform.select({android: 17, default: 60});

const keyExtractor = (item: PostListItem | PostListOtherItem) => (item.type === 'post' ? item.value.currentPost.id : item.value);

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
    contentContainerStyle,
    currentTimezone,
    currentUserId,
    currentUsername,
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
    nativeID,
    onEndReached,
    posts,
    rootId,
    shouldRenderReplyButton = true,
    shouldShowJoinLeaveMessages,
    showMoreMessages,
    showNewMessageLine = true,
    testID,
    savedPostIds,
    listRef,
}: Props) => {
    const firstIdInPosts = posts[0]?.id;

    const {
        height: keyboardHeightValue,
        inset: contentInset,
        onScroll: onScrollProp,
        postInputContainerHeight,
        keyboardHeight,
        isKeyboardFullyOpen,
        isKeyboardFullyClosed,
    } = useKeyboardAnimationContext();

    const keyboardState = useKeyboardState();
    const isKeyboardVisible = keyboardState.isVisible;
    const prevKeyboardVisible = useRef<boolean>(false);

    const onScrollEndIndexListener = useRef<onScrollEndIndexListenerEvent>();
    const onViewableItemsChangedListener = useRef<ViewableItemsChangedListenerEvent>();
    const scrolledToHighlighted = useRef(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showScrollToEndBtn, setShowScrollToEndBtn] = useState(false);
    const [lastPostId, setLastPostId] = useState<string | undefined>(firstIdInPosts);
    const [progressViewOffset, setProgressViewOffset] = useState(postInputContainerHeight);
    const theme = useTheme();
    const serverUrl = useServerUrl();

    // Emit keyboard state changes for tab bar visibility control
    useEffect(() => {
        // Detect state transitions to emit OPENING/CLOSING states
        let keyboardStateValue: KeyboardState;
        if (isKeyboardVisible && !prevKeyboardVisible.current) {
            // Transitioning from closed to open = OPENING
            keyboardStateValue = KeyboardState.OPENING;
        } else if (!isKeyboardVisible && prevKeyboardVisible.current) {
            // Transitioning from open to closed = CLOSING
            keyboardStateValue = KeyboardState.CLOSING;
        } else if (isKeyboardVisible) {
            // Already open = OPEN
            keyboardStateValue = KeyboardState.OPEN;
        } else {
            // Already closed = CLOSED
            keyboardStateValue = KeyboardState.CLOSED;
        }

        prevKeyboardVisible.current = isKeyboardVisible;
        DeviceEventEmitter.emit(Events.KEYBOARD_STATE_CHANGED, keyboardStateValue);
    }, [isKeyboardVisible]);

    // Update progressViewOffset to position RefreshControl correctly when keyboard-aware props are applied.
    // Only update when keyboard state changes (fully open ↔ fully closed) to prevent flickering during animation.
    const prevIsFullyOpen = useSharedValue(false);
    const prevIsFullyClosed = useSharedValue(true);
    useAnimatedReaction(
        () => ({
            isFullyOpen: isKeyboardFullyOpen.value,
            isFullyClosed: isKeyboardFullyClosed.value,
            height: keyboardHeightValue.value,
        }),
        ({isFullyOpen, isFullyClosed, height}) => {
            // Only update when state actually changes (transition detected)
            const stateChanged = (prevIsFullyClosed.value !== isFullyClosed) || (prevIsFullyOpen.value !== isFullyOpen);

            if (stateChanged && (isFullyOpen || isFullyClosed)) {
                const offset = postInputContainerHeight + height;
                runOnJS(setProgressViewOffset)(offset);
            }
            prevIsFullyOpen.value = isFullyOpen;
            prevIsFullyClosed.value = isFullyClosed;
        },
        [postInputContainerHeight],
    );

    const orderedPosts = useMemo(() => {
        return preparePostList(posts, lastViewedAt, showNewMessageLine, currentUserId, currentUsername, shouldShowJoinLeaveMessages, currentTimezone, location === Screens.THREAD, savedPostIds);
    }, [posts, lastViewedAt, showNewMessageLine, currentUserId, currentUsername, shouldShowJoinLeaveMessages, currentTimezone, location, savedPostIds]);

    const initialIndex = useMemo(() => {
        return orderedPosts.findIndex((i) => i.type === 'start-of-new-messages');
    }, [orderedPosts]);

    const isNewMessage = lastPostId ? firstIdInPosts !== lastPostId : false;

    const scrollToEnd = useCallback((forceScrollToEnd = false) => {
        const keyboardVisible = KeyboardController.isVisible();

        if (keyboardVisible && !forceScrollToEnd) {
            return;
        }

        const targetOffset = (forceScrollToEnd && keyboardVisible) ? -keyboardHeight.value : 0;

        listRef?.current?.scrollToOffset({offset: targetOffset, animated: true});
    }, [listRef, keyboardHeight]);

    useEffect(() => {
        const t = setTimeout(() => {
            scrollToEnd();
        }, 300);

        return () => clearTimeout(t);
    }, [channelId, rootId, scrollToEnd]);

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
        listRef?.current?.scrollToIndex({
            animated,
            index,
            viewOffset: applyOffset ? Platform.select({ios: -45, default: 0}) : 0,
            viewPosition: 1, // 0 is at bottom
        });
    }, [listRef]);

    const internalOnScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
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

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable && item.type === 'post') {
                acc[`${location}-${item.value.currentPost.id}`] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);

        if (onViewableItemsChangedListener.current) {
            onViewableItemsChangedListener.current(viewableItems);
        }
    }, [location]);

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

    useEffect(() => {
        setTimeout(() => {
            listRef?.current?.scrollToOffset({
                offset: 0,
            });
        }, 1000);
    }, [listRef]);

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
                const skipSaveddHeader = (location === Screens.THREAD && post.id === rootId);
                const postProps = {
                    appsEnabled,
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
                    skipSaveddHeader,
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
    }, [appsEnabled, currentTimezone, currentUsername, customEmojiNames, highlightPinnedOrSaved, highlightedId, isCRTEnabled, isPostAcknowledgementEnabled, location, rootId, shouldRenderReplyButton, shouldShowJoinLeaveMessages, testID, theme]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (highlightedId && orderedPosts && !scrolledToHighlighted.current) {
                scrolledToHighlighted.current = true;
                // eslint-disable-next-line max-nested-callbacks
                const index = orderedPosts.findIndex((p) => p.type === 'post' && p.value.currentPost.id === highlightedId);
                if (index >= 0 && listRef?.current) {
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
    }, [orderedPosts, highlightedId, listRef]);

    // For inverted list: paddingTop in contentContainerStyle = visual bottom padding
    const contentContainerStyleWithPadding = useMemo(() => {
        return [
            contentContainerStyle,
            {paddingTop: postInputContainerHeight},
        ];
    }, [contentContainerStyle, postInputContainerHeight]);

    // contentInset only for dynamic keyboard height
    const animatedProps = useAnimatedProps(
        () => {
            // For inverted FlatList, contentInset.top applies to the visual bottom
            return {
                contentInset: {
                    top: contentInset.value, // Only keyboard height (dynamic)
                },
            };
        },
        [contentInset],
    );

    return (
        <>
            <Animated.FlatList
                animatedProps={animatedProps}
                automaticallyAdjustContentInsets={false}
                contentInsetAdjustmentBehavior='never'
                contentContainerStyle={contentContainerStyleWithPadding}
                data={orderedPosts}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
                keyExtractor={keyExtractor}
                initialNumToRender={INITIAL_BATCH_TO_RENDER + 5}
                ListHeaderComponent={header}
                ListFooterComponent={footer}
                maintainVisibleContentPosition={SCROLL_POSITION_CONFIG}
                maxToRenderPerBatch={10}
                nativeID={nativeID}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.9}
                onScroll={onScrollProp}
                onMomentumScrollEnd={internalOnScroll}
                onScrollToIndexFailed={onScrollToIndexFailed}
                onViewableItemsChanged={onViewableItemsChanged}
                progressViewOffset={progressViewOffset}
                ref={listRef}
                removeClippedSubviews={true}
                renderItem={renderItem}
                scrollEventThrottle={SCROLL_EVENT_THROTTLE}
                style={styles.flex}
                viewabilityConfig={VIEWABILITY_CONFIG}
                testID={`${testID}.flat_list`}
                inverted={true}
                refreshing={refreshing}
                onRefresh={onRefresh}
            />
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
