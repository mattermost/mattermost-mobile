// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {Alert, FlatList} from 'react-native';

import {goToScreen} from '@actions/navigation';
import {THREAD} from '@constants/screen';
import EventEmitter from '@mm-redux/utils/event_emitter';

import ThreadList from './thread_list';

import type {ActionResult} from '@mm-redux/types/actions';
import type {Post} from '@mm-redux/types/posts';
import type {Team} from '@mm-redux/types/teams';
import type {Theme} from '@mm-redux/types/theme';
import type {ThreadsState, UserThread} from '@mm-redux/types/threads';
import type {UserProfile} from '@mm-redux/types/users';
import type {$ID} from '@mm-redux/types/utilities';

type Props = {
    actions: {
        getPostThread: (postId: string) => void;
        getThreads: (userId: $ID<UserProfile>, teamId: $ID<Team>, before?: $ID<UserThread>, after?: $ID<UserThread>, perPage?: number, deleted?: boolean, unread?: boolean) => Promise<ActionResult>;
        handleViewingGlobalThreadsAll: () => void;
        handleViewingGlobalThreadsUnreads: () => void;
        markAllThreadsInTeamRead: (userId: $ID<UserProfile>, teamId: $ID<Team>) => void;
        selectPost: (postId: string) => void;
    };
    allThreadIds: $ID<UserThread>[];
    intl: typeof intlShape;
    teamId: $ID<Team>;
    theme: Theme;
    threadCount: ThreadsState['counts'][$ID<Team>];
    unreadThreadIds: $ID<UserThread>[];
    userId: $ID<UserProfile>;
    viewingUnreads: boolean;
}

function GlobalThreadsList({actions, allThreadIds, intl, teamId, theme, threadCount, unreadThreadIds, userId, viewingUnreads}: Props) {
    const ids = viewingUnreads ? unreadThreadIds : allThreadIds;
    const haveUnreads = threadCount?.total_unread_threads > 0;

    const listRef = React.useRef<FlatList>(null);

    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

    const scrollToTop = () => {
        listRef.current?.scrollToOffset({offset: 0});
    };

    const loadThreads = async (before = '', after = '', unread = false) => {
        if (!isLoading) {
            setIsLoading(true);
        }
        await actions.getThreads(userId, teamId, before, after, undefined, false, unread);
        setIsLoading(false);
    };

    React.useEffect(() => {
        // Loads on mount, Loads on team change
        scrollToTop();
        loadThreads('', '', viewingUnreads);
    }, [teamId, viewingUnreads]);

    // Prevent from being called when an active request is pending.
    const loadMoreThreads = async () => {
        if (
            !isLoading &&
            ids.length &&
            threadCount.total
        ) {
            // Check if we have more threads to load.
            if (viewingUnreads) {
                if (threadCount.total_unread_threads === unreadThreadIds.length) {
                    return;
                }
            } else if (threadCount.total === allThreadIds.length) {
                return;
            }

            // Get the last thread, send request for threads after this thread.
            const lastThreadId = ids[ids.length - 1];
            await loadThreads(lastThreadId, '', viewingUnreads);
        }
    };

    const onRefresh = async () => {
        if (!isLoading) {
            if (!isRefreshing) {
                setIsRefreshing(true);
            }
            await loadThreads('', '', viewingUnreads);
            setIsRefreshing(false);
        }
    };

    const markAllAsRead = () => {
        Alert.alert(
            intl.formatMessage({
                id: 'global_threads.markAllRead.title',
                defaultMessage: 'Are you sure you want to mark all threads as read?',
            }),
            intl.formatMessage({
                id: 'global_threads.markAllRead.message',
                defaultMessage: 'This will clear any unread status for all of your threads shown here',
            }),
            [{
                text: intl.formatMessage({
                    id: 'global_threads.markAllRead.cancel',
                    defaultMessage: 'Cancel',
                }),
                style: 'cancel',
            }, {
                text: intl.formatMessage({
                    id: 'global_threads.markAllRead.markRead',
                    defaultMessage: 'Mark read',
                }),
                style: 'default',
                onPress: () => {
                    actions.markAllThreadsInTeamRead(userId, teamId);
                },
            }],
        );
    };

    const goToThread = React.useCallback((post: Post) => {
        actions.getPostThread(post.id);
        actions.selectPost(post.id);
        const passProps = {
            channelId: post.channel_id,
            rootId: post.id,
        };
        goToScreen(THREAD, '', passProps);
    }, []);

    React.useEffect(() => {
        EventEmitter.on('goToThread', goToThread);
        return () => {
            EventEmitter.off('goToThread', goToThread);
        };
    }, []);

    return (
        <ThreadList
            haveUnreads={haveUnreads}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            listRef={listRef}
            loadMoreThreads={loadMoreThreads}
            markAllAsRead={markAllAsRead}
            onRefresh={onRefresh}
            testID={'global_threads'}
            theme={theme}
            threadIds={ids}
            viewingUnreads={viewingUnreads}
            viewAllThreads={actions.handleViewingGlobalThreadsAll}
            viewUnreadThreads={actions.handleViewingGlobalThreadsUnreads}
        />
    );
}

export default injectIntl(GlobalThreadsList);
