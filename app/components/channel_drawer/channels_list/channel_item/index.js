// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannelId, getChannel} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelItem from './channel_item';

function mapStateToProps(state, ownProps) {
    const channel = getChannel(state, ownProps.channelId);

    return {
        currentChannelId: getCurrentChannelId(state),
        displayName: channel.display_name,
        status: channel.status,
        theme: getTheme(state),
        type: channel.type
    };
}

function areStatesEqual(next, prev) {
    return prev.entities.channels === next.entities.channels;
}

export default connect(mapStateToProps, null, null, {pure: true, areStatesEqual})(ChannelItem);
