// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannel, getMyCurrentChannelMembership} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {isChannelMuted} from 'mattermost-redux/utils/channel_utils';

import ChannelTitle from './channel_title';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);
    const myChannelMember = getMyCurrentChannelMembership(state);

    return {
        currentChannelName: currentChannel ? currentChannel.display_name : '',
        displayName: state.views.channel.displayName,
        isChannelMuted: isChannelMuted(myChannelMember),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelTitle);
