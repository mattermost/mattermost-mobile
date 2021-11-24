// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactElement, useCallback, useEffect, useRef} from 'react';
import {DeviceEventEmitter, FlatList, Platform, RefreshControl, StyleProp, StyleSheet, ViewStyle, ViewToken} from 'react-native';

import CombinedUserActivity from '@components/post_list/combined_user_activity';
import DateSeparator from '@components/post_list/date_separator';
import NewMessagesLine from '@components/post_list/new_message_line';
import Post from '@components/post_list/post';
import {useTheme} from '@context/theme';
import {emptyFunction} from '@utils/general';
import {getDateForDateLine, isCombinedUserActivityPost, isDateLine, isStartOfNewMessages, preparePostList} from '@utils/post_list';

import type PostModel from '@typings/database/models/servers/post';

type RefreshProps = {
    children: ReactElement;
    enabled: boolean;
    onRefresh: () => void;
    refreshing: boolean;
}

type Props = {
    channelId: string;
    contentContainerStyle?: StyleProp<ViewStyle>;
    currentTimezone: string | null;
    currentUsername: string;
    isTimezoneEnabled: boolean;
    lastViewedAt: number;
    posts: PostModel[];
    shouldShowJoinLeaveMessages: boolean;
    footer?: ReactElement;
    testID: string;
}

type ViewableItemsChanged = {
    viewableItems: ViewToken[];
    changed: ViewToken[];
}

const style = StyleSheet.create({
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

export const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 1,
    minimumViewTime: 100,
};

const keyExtractor = (item: string | PostModel) => (typeof item === 'string' ? item : item.id);

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    content: {
        marginHorizontal: 20,
    },
});

const PostListRefreshControl = ({children, enabled, onRefresh, refreshing}: RefreshProps) => {
    const props = {
        onRefresh,
        refreshing,
    };

    if (Platform.OS === 'android') {
        return (
            <RefreshControl
                {...props}
                enabled={enabled}
                style={style.container}
            >
                {children}
            </RefreshControl>
        );
    }

    const refreshControl = <RefreshControl {...props}/>;

    return React.cloneElement(
        children,
        {refreshControl, inverted: true},
    );
};

const PostList = ({channelId, contentContainerStyle, currentTimezone, currentUsername, footer, isTimezoneEnabled, lastViewedAt, posts, shouldShowJoinLeaveMessages, testID}: Props) => {
    const listRef = useRef<FlatList>(null);
    const theme = useTheme();
    const orderedPosts = preparePostList(posts, lastViewedAt, true, currentUsername, shouldShowJoinLeaveMessages, isTimezoneEnabled, currentTimezone, false);

    useEffect(() => {
        listRef.current?.scrollToOffset({offset: 0, animated: false});
    }, [channelId, listRef.current]);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable) {
                acc[item.id] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit('scrolled', viewableItemsMap);
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
                        style={style.scale}
                    />
                );
            } else if (isDateLine(item)) {
                return (
                    <DateSeparator
                        date={getDateForDateLine(item)}
                        theme={theme}
                        style={style.scale}
                        timezone={isTimezoneEnabled ? currentTimezone : null}
                    />
                );
            }

            if (isCombinedUserActivityPost(item)) {
                const postProps = {
                    currentUsername,
                    postId: item,
                    style: Platform.OS === 'ios' ? style.scale : style.container,
                    testID: `${testID}.combined_user_activity`,
                    showJoinLeave: shouldShowJoinLeaveMessages,
                    theme,
                };

                return (<CombinedUserActivity {...postProps}/>);
            }
        }

        let previousPost: PostModel|undefined;
        let nextPost: PostModel|undefined;
        if (index < posts.length - 1) {
            const prev = orderedPosts.slice(index + 1).find((v) => typeof v !== 'string');
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

        const postProps = {
            highlightPinnedOrFlagged: true,
            location: 'Channel',
            nextPost,
            previousPost,
            shouldRenderReplyButton: true,
        };

        return (
            <Post
                key={item.id}
                post={item}
                style={style.scale}
                testID={`${testID}.post`}
                {...postProps}
            />
        );
    }, [orderedPosts, theme]);

    return (
        <PostListRefreshControl
            enabled={false}
            refreshing={false}
            onRefresh={emptyFunction}
        >
            <FlatList
                contentContainerStyle={[styles.content, contentContainerStyle]}
                data={orderedPosts}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
                keyExtractor={keyExtractor}
                initialNumToRender={10}
                ListFooterComponent={footer}
                maxToRenderPerBatch={10}
                onViewableItemsChanged={onViewableItemsChanged}
                ref={listRef}
                renderItem={renderItem}
                removeClippedSubviews={true}
                scrollEventThrottle={60}
                style={styles.flex}
                viewabilityConfig={VIEWABILITY_CONFIG}
            />
        </PostListRefreshControl>
    );
};

export default PostList;
