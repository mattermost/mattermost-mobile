// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {selectPost} from 'mattermost-redux/actions/posts';
import {getPostIdsInCurrentChannel} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {goToScreen} from 'app/actions/navigation';
import {loadPostsIfNecessaryWithRetry, loadThreadIfNecessary, increasePostVisibility, refreshChannelWithRetry} from 'app/actions/views/channel';
import {recordLoadTime} from 'app/actions/views/root';
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
        postIds: getPostIdsInCurrentChannel(state),
        postVisibility: state.views.channel.postVisibility[channelId],
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
            goToScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelPostList);
