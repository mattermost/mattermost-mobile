// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {getCurrentChannel, getMyCurrentChannelMembership, getCurrentChannelStats} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getUser} from 'mattermost-redux/selectors/entities/users';
import {getUserIdFromChannelName, isChannelMuted} from 'mattermost-redux/utils/channel_utils';

import {isGuest} from 'app/utils/users';

import ChannelTitle from './channel_title';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);
    const currentUserId = getCurrentUserId(state);
    const myChannelMember = getMyCurrentChannelMembership(state);
    const stats = getCurrentChannelStats(state) || {member_count: 0, guest_count: 0};

    let isTeammateGuest = false;
    if (currentChannel && currentChannel.type === General.DM_CHANNEL) {
        const teammateId = getUserIdFromChannelName(currentUserId, currentChannel.name);
        const teammate = getUser(state, teammateId);
        isTeammateGuest = isGuest(teammate);
    }

    return {
        currentChannelName: currentChannel ? currentChannel.display_name : '',
        isArchived: currentChannel ? currentChannel.delete_at !== 0 : false,
        displayName: state.views.channel.displayName,
        channelType: currentChannel?.type,
        isChannelMuted: isChannelMuted(myChannelMember),
        theme: getTheme(state),
        isGuest: isTeammateGuest,
        hasGuests: stats.guest_count > 0,
    };
}

export default connect(mapStateToProps)(ChannelTitle);
