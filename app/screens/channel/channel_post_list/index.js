// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    loadPostsIfNecessaryWithRetry,
    increasePostVisibility,
    refreshChannelWithRetry,
} from '@actions/views/channel';
import {getPostThread} from '@actions/views/post';
import {recordLoadTime} from 'app/actions/views/root';
import {Types} from '@constants';
import {selectPost} from '@mm-redux/actions/posts';
import {getPostIdsInCurrentChannel} from '@mm-redux/selectors/entities/posts';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {isLandscape} from '@selectors/device';

import ChannelPostList from './channel_post_list';

function mapStateToProps(state) {
    const channelId = getCurrentChannelId(state);
    const channelRefreshingFailed = state.views.channel.retryFailed;

    return {
        channelId,
        channelRefreshingFailed,
        currentUserId: getCurrentUserId(state),
        deviceHeight: state.device.dimension.deviceHeight,
        postIds: getPostIdsInCurrentChannel(state) || Types.EMPTY_ARRAY,
        lastViewedAt: state.views.channel.lastChannelViewTime[channelId],
        loadMorePostsVisible: state.views.channel.loadMorePostsVisible,
        refreshing: state.views.channel.refreshing,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadPostsIfNecessaryWithRetry,
            getPostThread,
            increasePostVisibility,
            selectPost,
            recordLoadTime,
            refreshChannelWithRetry,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelPostList);
