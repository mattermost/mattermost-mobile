// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {getPostThread} from '@actions/views/post';
import {handleViewingGlobalThreadsAll, handleViewingGlobalThreadsUnreads} from '@actions/views/threads';
import {selectPost} from '@mm-redux/actions/posts';
import {getThreads, markAllThreadsInTeamRead} from '@mm-redux/actions/threads';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getTeamThreadCounts, getThreadOrderInCurrentTeam, getUnreadThreadOrderInCurrentTeam} from '@mm-redux/selectors/entities/threads';
import {getViewingGlobalThreadsUnread} from '@selectors/threads';

import GlobalThreads from './global_threads';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    const teamId = getCurrentTeamId(state);
    return {
        teamId,
        userId: getCurrentUserId(state),
        viewingUnreads: getViewingGlobalThreadsUnread(state),
        allThreadIds: getThreadOrderInCurrentTeam(state),
        unreadThreadIds: getUnreadThreadOrderInCurrentTeam(state),
        threadCount: getTeamThreadCounts(state, teamId),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            getPostThread,
            getThreads,
            handleViewingGlobalThreadsAll,
            handleViewingGlobalThreadsUnreads,
            markAllThreadsInTeamRead,
            selectPost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(GlobalThreads);
