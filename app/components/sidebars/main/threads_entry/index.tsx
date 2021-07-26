// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {handleViewingGlobalThreadsScreen} from '@actions/views/threads';
import {getThreads} from '@mm-redux/actions/threads';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getTeamThreadCounts} from '@mm-redux/selectors/entities/threads';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getViewingGlobalThreads, getViewingGlobalThreadsUnread} from '@selectors/threads';

import ThreadsEntry from './threads_entry';

import type {GlobalState} from '@mm-redux/types/store';

function mapStateToProps(state: GlobalState) {
    const currentTeamId = getCurrentTeamId(state);
    return {
        currentTeamId,
        currentUserId: getCurrentUserId(state),
        isUnreadSelected: getViewingGlobalThreadsUnread(state),
        threadCount: getTeamThreadCounts(state, currentTeamId),
        theme: getTheme(state),
        viewingGlobalThreads: getViewingGlobalThreads(state),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            getThreads,
            handleViewingGlobalThreadsScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ThreadsEntry);
