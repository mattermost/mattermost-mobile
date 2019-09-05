// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {makeGetChannel} from 'mattermost-redux/selectors/entities/channels';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isLandscape} from 'app/selectors/device';
import ChannelDisplayName from './channel_display_name';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();
    return (state, ownProps) => {
        const post = getPost(state, ownProps.postId);
        const channel = post ? getChannel(state, {id: post.channel_id}) : null;

        return {
            displayName: channel ? channel.display_name : '',
            theme: getTheme(state),
            isLandscape: isLandscape(state),
        };
    };
}

export default connect(makeMapStateToProps)(ChannelDisplayName);
