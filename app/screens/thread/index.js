// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {updateThreadLastViewedAt} from '@actions/views/threads';
import {fetchThreadAppBindings, clearThreadAppBindings} from '@mm-redux/actions/apps';
import {selectPost} from '@mm-redux/actions/posts';
import {setThreadFollow, updateThreadRead} from '@mm-redux/actions/threads';
import {getChannel, getMyCurrentChannelMembership} from '@mm-redux/selectors/entities/channels';
import {getCurrentChannelId, getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {makeGetPostIdsForThread} from '@mm-redux/selectors/entities/posts';
import {getTheme, isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';
import {getThread} from '@mm-redux/selectors/entities/threads';
import {getThreadLastViewedAt} from '@selectors/threads';

import Thread from './thread';

function makeMapStateToProps() {
    const getPostIdsForThread = makeGetPostIdsForThread();
    return function mapStateToProps(state, ownProps) {
        const channel = getChannel(state, ownProps.channelId);

        const collapsedThreadsEnabled = isCollapsedThreadsEnabled(state);
        const myMember = getMyCurrentChannelMembership(state);
        const thread = collapsedThreadsEnabled ? getThread(state, ownProps.rootId, true) : null;
        let lastViewedAt = myMember?.last_viewed_at;
        if (collapsedThreadsEnabled) {
            lastViewedAt = getThreadLastViewedAt(state, thread.id);
        }
        return {
            channelId: ownProps.channelId,
            channelIsArchived: channel ? channel.delete_at !== 0 : false,
            channelType: channel ? channel.type : '',
            collapsedThreadsEnabled,
            currentUserId: getCurrentUserId(state),
            displayName: channel ? channel.display_name : '',
            lastViewedAt,
            myMember,
            postIds: getPostIdsForThread(state, ownProps.rootId),
            theme: getTheme(state),
            thread,
            threadLoadingStatus: state.requests.posts.getPostThread,
            shouldFetchBindings: ownProps.channelId !== getCurrentChannelId(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectPost,
            setThreadFollow,
            updateThreadRead,
            updateThreadLastViewedAt,
            fetchThreadAppBindings,
            clearThreadAppBindings,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Thread);
