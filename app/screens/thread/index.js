// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {selectPost} from '@mm-redux/actions/posts';
import {setThreadFollow, updateThreadRead} from '@mm-redux/actions/threads';
import {AppBindingLocations} from '@mm-redux/constants/apps';
import {getAppsBindings} from '@mm-redux/selectors/entities/apps';
import {getChannel, getCurrentChannelId, getMyCurrentChannelMembership} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {makeGetPostIdsForThread} from '@mm-redux/selectors/entities/posts';
import {getTheme, isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getThread} from '@mm-redux/selectors/entities/threads';

import Thread from './thread';

function makeMapStateToProps() {
    const getPostIdsForThread = makeGetPostIdsForThread();
    return function mapStateToProps(state, ownProps) {
        const channel = getChannel(state, ownProps.channelId);

        let postBindings = null;
        if (ownProps.channelId === getCurrentChannelId(state)) {
            postBindings = getAppsBindings(state, AppBindingLocations.POST_MENU_ITEM);
        }

        const collapsedThreadsEnabled = isCollapsedThreadsEnabled(state);
        return {
            channelId: ownProps.channelId,
            channelIsArchived: channel ? channel.delete_at !== 0 : false,
            channelType: channel ? channel.type : '',
            collapsedThreadsEnabled,
            currentUserId: getCurrentUserId(state),
            displayName: channel ? channel.display_name : '',
            myMember: getMyCurrentChannelMembership(state),
            postIds: getPostIdsForThread(state, ownProps.rootId),
            theme: getTheme(state),
            thread: collapsedThreadsEnabled ? getThread(state, ownProps.rootId, true) : null,
            threadLoadingStatus: state.requests.posts.getPostThread,
            postBindings,
            teamId: channel.team_id || getCurrentTeamId(state),
            userId: getCurrentUserId(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectPost,
            setThreadFollow,
            updateThreadRead,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Thread);
