// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {goBack} from 'app/actions/navigation';
import {handleRemoveChannelMembers} from 'app/actions/views/channel_members';
import {Channels} from 'service/constants';
import {getCurrentChannel, getCurrentChannelStats} from 'service/selectors/entities/channels';
import {getMyPreferences, getTheme} from 'service/selectors/entities/preferences';
import {getCurrentTeam} from 'service/selectors/entities/teams';
import {getProfilesInCurrentChannel, getCurrentUserRoles} from 'service/selectors/entities/users';
import {getProfilesInChannel} from 'service/actions/users';

import ChannelMembers from './channel_members';

function mapStateToProps(state) {
    const currentChannel = getCurrentChannel(state);
    const currentChannelMemberCount = getCurrentChannelStats(state) && getCurrentChannelStats(state).member_count;
    const currentUserRoles = getCurrentUserRoles(state);

    const canManageUsers = currentChannel.type === Channels.PUBLIC || currentUserRoles.includes('_admin');

    return {
        theme: getTheme(state),
        currentChannel,
        currentChannelMembers: getProfilesInCurrentChannel(state),
        currentChannelMemberCount,
        currentUserId: state.entities.users.currentId,
        currentTeam: getCurrentTeam(state),
        preferences: getMyPreferences(state),
        requestStatus: state.requests.users.getProfilesInChannel.status,
        canManageUsers
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfilesInChannel,
            goBack,
            handleRemoveChannelMembers
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(ChannelMembers);
