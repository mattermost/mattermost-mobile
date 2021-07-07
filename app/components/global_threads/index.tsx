// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Alert, FlatList} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import {useSelector, useDispatch} from 'react-redux';

import {handleViewingGlobalThreadsAll, handleViewingGlobalThreadsUnreads} from '@actions/views/threads';
import {DispatchFunc} from '@mm-redux/types/actions';
import {getThreads, markAllThreadsInTeamRead} from '@mm-redux/actions/threads';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getTeamThreadCounts, getThreadOrderInCurrentTeam, getUnreadThreadOrderInCurrentTeam} from '@mm-redux/selectors/entities/threads';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import type {GlobalState} from '@mm-redux/types/store';
import {getViewingGlobalThreadsUnread} from '@selectors/threads';

import ThreadList from './thread_list';

type Props = {
    intl: typeof intlShape;
}

function GlobalThreadsList({intl}: Props) {
    const dispatch: DispatchFunc = useDispatch();

    const teamId = useSelector((state: GlobalState) => getCurrentTeamId(state));
    const userId = useSelector((state: GlobalState) => getCurrentUserId(state));
    const viewingUnreads = useSelector((state: GlobalState) => getViewingGlobalThreadsUnread(state));

    const allThreadIds = useSelector((state: GlobalState) => getThreadOrderInCurrentTeam(state));
    const unreadThreadIds = useSelector((state: GlobalState) => getUnreadThreadOrderInCurrentTeam(state));
    const ids = viewingUnreads ? unreadThreadIds : allThreadIds;

    const threadCount = useSelector((state:GlobalState) => getTeamThreadCounts(state, teamId));
    const haveUnreads = threadCount?.total_unread_threads > 0;

    const listRef = React.useRef<FlatList>(null);

    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    const loadThreads = React.useCallback(async (before = '', after = '', unread = false) => {
        setIsLoading(true);
        await dispatch(getThreads(userId, teamId, before, after, undefined, false, unread));
        setIsLoading(false);
    }, [teamId]);

    React.useEffect(() => {
        // Loads on mount, Loads on team change
        loadThreads('', ids[0]);
    }, [loadThreads, teamId]);

    // Prevent from being called when an active request is pending.
    const isLoadingMoreThreads = React.useRef<boolean>(false);
    const loadMoreThreads = React.useCallback(async () => {
        if (
            !isLoadingMoreThreads.current &&
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
            isLoadingMoreThreads.current = true;
            try {
                await loadThreads(lastThreadId, '', viewingUnreads);
            } finally {
                isLoadingMoreThreads.current = false;
            }
        }
    }, [allThreadIds, ids, loadThreads, unreadThreadIds, viewingUnreads]);

    const handleViewAllThreads = React.useCallback(() => {
        isLoadingMoreThreads.current = false;
        listRef.current?.scrollToOffset({offset: 0});
        loadThreads('', allThreadIds[0], false);
        dispatch(handleViewingGlobalThreadsAll());
    }, [loadThreads, allThreadIds]);

    const handleViewUnreadThreads = React.useCallback(() => {
        isLoadingMoreThreads.current = false;
        listRef.current?.scrollToOffset({offset: 0});
        loadThreads('', unreadThreadIds[0], true);
        dispatch(handleViewingGlobalThreadsUnreads());
    }, [loadThreads, unreadThreadIds]);

    const markAllAsRead = React.useCallback(() => {
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
                    dispatch(markAllThreadsInTeamRead(userId, teamId));
                },
            }],
        );
    }, [dispatch, teamId, userId]);

    return (
        <ThreadList
            haveUnreads={haveUnreads}
            isLoading={isLoading}
            listRef={listRef}
            loadMoreThreads={loadMoreThreads}
            markAllAsRead={markAllAsRead}
            testID={'global_threads'}
            threadIds={ids}
            viewingUnreads={viewingUnreads}
            viewAllThreads={handleViewAllThreads}
            viewUnreadThreads={handleViewUnreadThreads}
        />
    );
}

export default injectIntl(GlobalThreadsList);
