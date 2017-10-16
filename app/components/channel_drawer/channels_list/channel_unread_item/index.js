// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannelId, getChannel, getMyChannelMember} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelUnreadItem from './channel_unread_item';

function mapStateToProps(state, ownProps) {
    const channel = getChannel(state, ownProps.channelId);
    const member = getMyChannelMember(state, ownProps.channelId);

    return {
        currentChannelId: getCurrentChannelId(state),
        displayName: channel.display_name,
        hasUnread: channel.total_msg_count - member.msg_count > 0,
        mentions: member.mention_count,
        status: channel.status,
        theme: getTheme(state),
        type: channel.type
    };
}

function areStatesEqual(next, prev) {
    return prev.entities.channels === next.entities.channels;
}

export default connect(mapStateToProps, null, null, {pure: true, areStatesEqual})(ChannelUnreadItem);
