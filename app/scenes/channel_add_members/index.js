// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import navigationSceneConnect from '../navigationSceneConnect';

import {handleAddChannelMembers} from 'app/actions/views/channel_add_members';
import {goBack} from 'app/actions/navigation';
import {getTheme} from 'app/selectors/preferences';
import {getCurrentChannel, getCurrentChannelStats} from 'mattermost-redux/selectors/entities/channels';
import {getMyPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeam, getCurrentTeamStats} from 'mattermost-redux/selectors/entities/teams';
import {getProfilesNotInCurrentChannel} from 'mattermost-redux/selectors/entities/users';
import {getTeamStats} from 'mattermost-redux/actions/teams';
import {getProfilesNotInChannel, searchProfiles} from 'mattermost-redux/actions/users';

import ChannelAddMembers from './channel_add_members';

function mapStateToProps(state) {
    const currentTeamMemberCount = getCurrentTeamStats(state) && getCurrentTeamStats(state).total_member_count;
    const currentChannelMemberCount = getCurrentChannelStats(state) && getCurrentChannelStats(state).member_count;

    return {
        theme: getTheme(state),
        currentChannel: getCurrentChannel(state),
        membersNotInChannel: getProfilesNotInCurrentChannel(state),
        currentTeam: getCurrentTeam(state),
        currentTeamMemberCount,
        currentChannelMemberCount,
        preferences: getMyPreferences(state),
        loadMoreRequestStatus: state.requests.users.getProfilesNotInChannel.status,
        addChannelMemberRequestStatus: state.requests.channels.addChannelMember,
        searchRequestStatus: state.requests.users.searchProfiles.status,
        addChannelMemberStatus: state.requests.channels.addChannelMember.status
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeamStats,
            getProfilesNotInChannel,
            goBack,
            handleAddChannelMembers,
            searchProfiles
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(ChannelAddMembers);
