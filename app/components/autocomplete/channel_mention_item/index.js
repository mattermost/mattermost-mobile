// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getChannel} from 'mattermost-redux/selectors/entities/channels';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {General} from 'mattermost-redux/constants';

import ChannelMentionItem from './channel_mention_item';

function mapStateToProps(state, ownProps) {
    const channel = getChannel(state, ownProps.channelId);
    let displayName = channel.display_name;

    // Bypassing the channel display name generation in DMs and GMs
    if (channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL) {
        displayName = state.entities.channels.channels[ownProps.channelId].display_name;
    }

    return {
        displayName,
        name: channel.name,
        type: channel.type,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelMentionItem);
