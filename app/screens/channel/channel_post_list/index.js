// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectPost, loadThreadIfNecessary} from '@mm-redux/actions/posts';
import {getPostIdsInCurrentChannel} from '@mm-redux/selectors/entities/posts';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {
    increasePostVisibility,
    refreshChannelWithRetry,
} from '@actions/channels';
import {loadPostsIfNecessaryWithRetry} from '@actions/views/post';
import {recordLoadTime} from '@actions/views/root';
import {Types} from 'app/constants';
import {isLandscape} from 'app/selectors/device';

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
            loadThreadIfNecessary,
            increasePostVisibility,
            selectPost,
            recordLoadTime,
            refreshChannelWithRetry,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelPostList);
