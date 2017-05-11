// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import ChannelDrawerList from './channel_drawer_list';

function mapStateToProps(state, ownProps) {
    const {config, license} = state.entities.general;
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';

    return {
        canCreatePrivateChannels: showCreateOption(config, license, General.PRIVATE_CHANNEL, isAdmin(roles), isSystemAdmin(roles)),
        ...ownProps
    };
}

export default connect(mapStateToProps)(ChannelDrawerList);
