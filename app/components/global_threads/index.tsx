// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Alert} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import {useSelector, useDispatch} from 'react-redux';

import {handleViewingGlobalThreadsAll, handleViewingGlobalThreadsUnreads} from '@actions/views/threads';
import {getThreads, markAllThreadsInTeamRead} from '@mm-redux/actions/threads';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getThreadOrderInCurrentTeam, getUnreadThreadOrderInCurrentTeam} from '@mm-redux/selectors/entities/threads';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import type {GlobalState} from '@mm-redux/types/store';
import {getViewingGlobalThreadsUnread} from '@selectors/threads';

import ThreadList from './thread_list';

type Props = {
    intl: typeof intlShape;
}

function GlobalThreadsList({intl}: Props) {
    const teamId = useSelector((state: GlobalState) => getCurrentTeamId(state));
    const threadIds = useSelector((state: GlobalState) => getThreadOrderInCurrentTeam(state));
    const unreadThreadIds = useSelector((state: GlobalState) => getUnreadThreadOrderInCurrentTeam(state));
    const userId = useSelector((state: GlobalState) => getCurrentUserId(state));
    const viewingUnreads = useSelector((state: GlobalState) => getViewingGlobalThreadsUnread(state));
    const haveUnreads = unreadThreadIds.length > 0;

    const dispatch = useDispatch();

    const handleViewAllThreads = () => {
        dispatch(getThreads(userId, teamId, '', '', undefined, false));
        dispatch(handleViewingGlobalThreadsAll());
    };

    const handleViewUnreadThreads = () => {
        dispatch(getThreads(userId, teamId, '', '', undefined, true));
        dispatch(handleViewingGlobalThreadsUnreads());
    };

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
            markAllAsRead={markAllAsRead}
            testID={'global_threads'}
            threadIds={viewingUnreads ? unreadThreadIds : threadIds}
            viewingUnreads={viewingUnreads}
            viewAllThreads={handleViewAllThreads}
            viewUnreadThreads={handleViewUnreadThreads}
        />
    );
}

export default injectIntl(GlobalThreadsList);
