// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {handleAddChannelMembers} from 'app/actions/views/channel_add_members';
import {goBack} from 'app/actions/navigation';
import {getCurrentChannel, getCurrentChannelStats} from 'service/selectors/entities/channels';
import {getMyPreferences} from 'service/selectors/entities/preferences';
import {getCurrentTeam, getCurrentTeamStats} from 'service/selectors/entities/teams';
import {getProfilesNotInCurrentChannel} from 'service/selectors/entities/users';
import {getTeamStats} from 'service/actions/teams';
import {getProfilesNotInChannel} from 'service/actions/users';

import ChannelAddMembers from './channel_add_members';

function mapStateToProps(state) {
    const currentTeamMemberCount = getCurrentTeamStats(state) && getCurrentTeamStats(state).total_member_count;
    const currentChannelMemberCount = getCurrentChannelStats(state) && getCurrentChannelStats(state).member_count;

    return {
        currentChannel: getCurrentChannel(state),
        membersNotInChannel: getProfilesNotInCurrentChannel(state),
        currentTeam: getCurrentTeam(state),
        currentTeamMemberCount,
        currentChannelMemberCount,
        preferences: getMyPreferences(state),
        loadMoreRequestStatus: state.requests.users.getProfilesNotInChannel.status,
        addChannelMemberRequestStatus: state.requests.channels.addChannelMember
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeamStats,
            getProfilesNotInChannel,
            goBack,
            handleAddChannelMembers
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(ChannelAddMembers);
