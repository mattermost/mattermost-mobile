// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelDisplayName from './channel_display_name';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();
    return (state, ownProps) => {
        const post = getPost(state, ownProps.postId);
        const channel = getChannel(state, {id: post.channel_id});

        return {
            displayName: channel ? channel.display_name : '',
            theme: getTheme(state),
        };
    };
}

export default connect(makeMapStateToProps)(ChannelDisplayName);
