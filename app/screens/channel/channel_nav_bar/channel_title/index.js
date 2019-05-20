// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {getCurrentChannel, getMyCurrentChannelMembership} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId, getUser, getUserByUsername} from 'mattermost-redux/selectors/entities/users';
import {getUserIdFromChannelName, isChannelMuted} from 'mattermost-redux/utils/channel_utils';

import {isGuest} from 'app/utils/users';

import ChannelTitle from './channel_title';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);
    const currentUserId = getCurrentUserId(state);
    const myChannelMember = getMyCurrentChannelMembership(state);

    let isTeammateGuest = false;
    let hasGuests = false;
    if (currentChannel && currentChannel.type === General.DM_CHANNEL) {
        const teammateId = getUserIdFromChannelName(currentUserId, currentChannel.name);
        const teammate = getUser(state, teammateId);
        if (isGuest(teammate)) {
            isTeammateGuest = true;
        }
    } else if (currentChannel && currentChannel.type === General.GM_CHANNEL) {
        for (const username of currentChannel.display_name.split(',')) {
            const user = getUserByUsername(state, username.trim());
            if (isGuest(user)) {
                hasGuests = true;
                break;
            }
        }
    }

    return {
        currentChannelName: currentChannel ? currentChannel.display_name : '',
        isArchived: currentChannel ? currentChannel.delete_at !== 0 : false,
        displayName: state.views.channel.displayName,
        isChannelMuted: isChannelMuted(myChannelMember),
        theme: getTheme(state),
        isGuest: isTeammateGuest,
        hasGuests,
    };
}

export default connect(mapStateToProps)(ChannelTitle);
