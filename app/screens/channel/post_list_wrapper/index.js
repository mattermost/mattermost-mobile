// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';

import PostListWrapper from './post_list_wrapper';

function mapStateToProps(state) {
    const channelId = getCurrentChannelId(state);
    return {
        lastViewedAt: state.views.channel.lastChannelViewTime[channelId],
        channelId,
    };
}

export default connect(mapStateToProps)(PostListWrapper);
