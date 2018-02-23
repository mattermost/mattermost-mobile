// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelTitle from './channel_title';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);

    return {
        currentChannelName: currentChannel ? currentChannel.display_name : '',
        displayName: state.views.channel.displayName,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelTitle);
