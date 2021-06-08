// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectPost} from '@mm-redux/actions/posts';
import {setThreadFollow, updateThreadRead} from '@mm-redux/actions/threads';
import {makeGetChannel, getMyCurrentChannelMembership} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {makeGetPostIdsForThread} from '@mm-redux/selectors/entities/posts';
import {getTheme, isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getThread} from '@mm-redux/selectors/entities/threads';

import Thread from './thread';

function makeMapStateToProps() {
    const getPostIdsForThread = makeGetPostIdsForThread();
    const getChannel = makeGetChannel();

    return function mapStateToProps(state, ownProps) {
        const channel = getChannel(state, {id: ownProps.channelId});
        const collapsedThreadsEnabled = isCollapsedThreadsEnabled(state);
        return {
            channelId: ownProps.channelId,
            channelIsArchived: channel ? channel.delete_at !== 0 : false,
            channelType: channel ? channel.type : '',
            collapsedThreadsEnabled,
            displayName: channel ? channel.display_name : '',
            myMember: getMyCurrentChannelMembership(state),
            postIds: getPostIdsForThread(state, ownProps.rootId),
            rootId: ownProps.rootId,
            teamId: getCurrentTeamId(state),
            theme: getTheme(state),
            thread: getThread(state, ownProps.rootId),
            threadLoadingStatus: state.requests.posts.getPostThread,
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
