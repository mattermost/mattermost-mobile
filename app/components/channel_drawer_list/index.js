// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {searchChannels} from 'mattermost-redux/actions/channels';
import {searchProfiles} from 'mattermost-redux/actions/users';
import {getCurrentUserId, getCurrentUserRoles, getUsers, getUserStatuses} from 'mattermost-redux/selectors/entities/users';
import {getOtherChannels} from 'mattermost-redux/selectors/entities/channels';
import {getMyPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import {setChannelDisplayName} from 'app/actions/views/channel';

import ChannelDrawerList from './channel_drawer_list';

function mapStateToProps(state, ownProps) {
    const {config, license} = state.entities.general;
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';

    return {
        canCreatePrivateChannels: showCreateOption(config, license, General.PRIVATE_CHANNEL, isAdmin(roles), isSystemAdmin(roles)),
        otherChannels: getOtherChannels(state),
        profiles: getUsers(state),
        myPreferences: getMyPreferences(state),
        statuses: getUserStatuses(state),
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            searchChannels,
            searchProfiles,
            setChannelDisplayName
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawerList);
