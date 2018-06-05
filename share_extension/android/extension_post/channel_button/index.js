// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getChannel} from 'mattermost-redux/selectors/entities/channels';

import ChannelButton from './channel_button';

function mapStateToProps(state, ownProps) {
    return {
        channel: getChannel(state, ownProps.channelId),
    };
}

export default connect(mapStateToProps)(ChannelButton);
