// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';

import {showPermalink} from '@actions/views/permalink';
import {
    flagPost,
    setUnreadPost,
    unflagPost,
} from '@mm-redux/actions/posts';
import {setThreadFollow, updateThreadRead} from '@mm-redux/actions/threads';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getPost} from '@mm-redux/selectors/entities/posts';
import {getMyPreferences, getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeam, getCurrentTeamUrl} from '@mm-redux/selectors/entities/teams';
import {getThread} from '@mm-redux/selectors/entities/threads';
import {isPostFlagged} from '@mm-redux/utils/post_utils';
import {getDimensions} from '@selectors/device';

import ThreadOptions, {OwnProps} from './thread_options';

import type {GlobalState} from '@mm-redux/types/store';

export function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const myPreferences = getMyPreferences(state);
    return {
        ...getDimensions(state),
        currentTeamName: getCurrentTeam(state)?.name,
        currentTeamUrl: getCurrentTeamUrl(state),
        currentUserId: getCurrentUserId(state),
        isFlagged: isPostFlagged(ownProps.rootId, myPreferences),
        post: getPost(state, ownProps.rootId),
        theme: getTheme(state),
        thread: getThread(state, ownProps.rootId),
    };
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        actions: bindActionCreators({
            flagPost,
            setThreadFollow,
            setUnreadPost,
            showPermalink,
            unflagPost,
            updateThreadRead,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ThreadOptions);
