// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {getChannelsWithUnreadSection, getCurrentChannel, getMyChannelMemberships} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import List from './list';

function mapStateToProps(state, ownProps) {
    const {config, license} = state.entities.general;
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';

    return {
        canCreatePrivateChannels: showCreateOption(config, license, General.PRIVATE_CHANNEL, isAdmin(roles), isSystemAdmin(roles)),
        channelMembers: getMyChannelMemberships(state),
        channels: getChannelsWithUnreadSection(state),
        currentChannel: getCurrentChannel(state),
        theme: getTheme(state),
        ...ownProps
    };
}

export default connect(mapStateToProps, null)(List);
