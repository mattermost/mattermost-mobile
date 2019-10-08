// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectPost} from 'mattermost-redux/actions/posts';
import {getRecentPostsChunkInChannel, getUnreadPostsChunk} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {loadPostsIfNecessaryWithRetry, loadThreadIfNecessary, loadPosts, refreshChannelWithRetry} from 'app/actions/views/channel';
import {recordLoadTime} from 'app/actions/views/root';
import {isLandscape} from 'app/selectors/device';

import ChannelPostList from './channel_post_list';

function mapStateToProps(state, ownProps) {
    let postIds;
    let chunk;
    let atLatestPost = false;
    let atOldestPost = false;
    const channelId = getCurrentChannelId(state);
    const channelRefreshingFailed = state.views.channel.retryFailed;

    if (ownProps.unreadChunkTimeStamp) {
        chunk = getUnreadPostsChunk(state, channelId, ownProps.unreadChunkTimeStamp);
    } else {
        chunk = getRecentPostsChunkInChannel(state, channelId);
    }

    if (chunk) {
        postIds = chunk.order;
        atLatestPost = chunk.recent;
        atOldestPost = chunk.oldest;
    }

    return {
        channelId,
        channelRefreshingFailed,
        currentUserId: getCurrentUserId(state),
        deviceHeight: state.device.dimension.deviceHeight,
        postIds,
        lastViewedAt: state.views.channel.lastChannelViewTime[channelId],
        atLatestPost,
        atOldestPost,
        refreshing: state.views.channel.refreshing,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadPostsIfNecessaryWithRetry,
            loadThreadIfNecessary,
            loadPosts,
            selectPost,
            recordLoadTime,
            refreshChannelWithRetry,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelPostList);
