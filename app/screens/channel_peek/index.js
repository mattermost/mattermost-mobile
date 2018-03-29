// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {markChannelAsRead} from 'mattermost-redux/actions/channels';
import {getPostIdsInChannel} from 'mattermost-redux/selectors/entities/posts';
import {getMyChannelMember} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {loadPostsIfNecessaryWithRetry} from 'app/actions/views/channel';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelPeek from './channel_peek';

function mapStateToProps(state, ownProps) {
    const channelId = ownProps.channelId;

    return {
        channelId,
        currentUserId: getCurrentUserId(state),
        postIds: getPostIdsInChannel(state, channelId),
        lastViewedAt: getMyChannelMember(state, channelId).last_viewed_at,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadPostsIfNecessaryWithRetry,
            markChannelAsRead,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelPeek);
