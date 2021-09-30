// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {ReactElement, useCallback} from 'react';
import {DeviceEventEmitter, FlatList, Platform, RefreshControl, StyleSheet, ViewToken} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import CombinedUserActivity from '@components/post_list/combined_user_activity';
import DateSeparator from '@components/post_list/date_separator';
import NewMessagesLine from '@components/post_list/new_message_line';
import Post from '@components/post_list/post';
import {Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useTheme} from '@context/theme';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {emptyFunction} from '@utils/general';
import {getDateForDateLine, isCombinedUserActivityPost, isDateLine, isStartOfNewMessages, preparePostList} from '@utils/post_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type RefreshProps = {
    children: ReactElement;
    enabled: boolean;
    onRefresh: () => void;
    refreshing: boolean;
}

type Props = {
    currentTimezone: UserTimezone | null;
    currentUsername: string;
    isTimezoneEnabled: boolean;
    lastViewedAt: number;
    posts: PostModel[];
    shouldShowJoinLeaveMessages: boolean;
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

const {SERVER: {MY_CHANNEL, POST, POSTS_IN_CHANNEL, PREFERENCE, SYSTEM, USER}} = MM_TABLES;

export const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 1,
    minimumViewTime: 100,
};

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

const PostList = ({currentTimezone, currentUsername, isTimezoneEnabled, lastViewedAt, posts, shouldShowJoinLeaveMessages, testID}: Props) => {
    const theme = useTheme();
    const orderedPosts = preparePostList(posts, lastViewedAt, true, currentUsername, shouldShowJoinLeaveMessages, isTimezoneEnabled, currentTimezone, false);

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
                        timezone={currentTimezone}
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
                data={orderedPosts}
                renderItem={renderItem}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='handled'
                keyExtractor={(item) => (typeof item === 'string' ? item : item.id)}
                style={{flex: 1}}
                contentContainerStyle={{paddingTop: 5}}
                initialNumToRender={25}
                maxToRenderPerBatch={25}
                removeClippedSubviews={true}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={VIEWABILITY_CONFIG}
                windowSize={30}
                scrollEventThrottle={60}
            />
        </PostListRefreshControl>
    );
};

const withPosts = withObservables(['channelId'], ({database, channelId}: {channelId: string} & WithDatabaseArgs) => {
    const currentUser = database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId: SystemModel) => database.get(USER).findAndObserve(currentUserId.value)),
    );

    return {
        currentTimezone: currentUser.pipe((switchMap((user: UserModel) => of$(user.timezone)))),
        currentUsername: currentUser.pipe((switchMap((user: UserModel) => of$(user.username)))),
        isTimezoneEnabled: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
            switchMap((config: SystemModel) => of$(config.value.ExperimentalTimezone === 'true')),
        ),
        lastViewedAt: database.get(MY_CHANNEL).findAndObserve(channelId).pipe(
            switchMap((myChannel: MyChannelModel) => of$(myChannel.lastViewedAt)),
        ),
        posts: database.get(POSTS_IN_CHANNEL).query(
            Q.where('channel_id', channelId),
            Q.experimentalSortBy('latest', Q.desc),
        ).observe().pipe(
            switchMap((postsInChannel: PostsInChannelModel[]) => {
                if (!postsInChannel.length) {
                    return of$([]);
                }

                const {earliest, latest} = postsInChannel[0];
                return database.get(POST).query(
                    Q.and(
                        Q.where('delete_at', 0),
                        Q.where('channel_id', channelId),
                        Q.where('create_at', Q.between(earliest, latest)),
                    ),
                    Q.experimentalSortBy('create_at', Q.desc),
                ).observe();
            }),
        ),
        shouldShowJoinLeaveMessages: database.get(PREFERENCE).query(
            Q.where('category', Preferences.CATEGORY_ADVANCED_SETTINGS),
            Q.where('name', Preferences.ADVANCED_FILTER_JOIN_LEAVE),
        ).observe().pipe(
            switchMap((preferences: PreferenceModel[]) => of$(getPreferenceAsBool(preferences, Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE, true))),
        ),
    };
});

export default withDatabase(withPosts(React.memo(PostList)));
