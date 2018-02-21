// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleAddChannelMembers} from 'app/actions/views/channel_add_members';
import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getMyPreferences, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeam} from 'mattermost-redux/selectors/entities/teams';
import {getProfilesNotInCurrentChannel} from 'mattermost-redux/selectors/entities/users';
import {getTeamStats} from 'mattermost-redux/actions/teams';
import {getProfilesNotInChannel, searchProfiles} from 'mattermost-redux/actions/users';

import ChannelAddMembers from './channel_add_members';

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
        currentChannel: getCurrentChannel(state) || {},
        membersNotInChannel: getProfilesNotInCurrentChannel(state),
        currentTeam: getCurrentTeam(state) || {},
        preferences: getMyPreferences(state),
        loadMoreRequestStatus: state.requests.users.getProfilesNotInChannel.status,
        addChannelMemberRequestStatus: state.requests.channels.addChannelMember,
        searchRequestStatus: state.requests.users.searchProfiles.status,
        addChannelMemberStatus: state.requests.channels.addChannelMember.status,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getTeamStats,
            getProfilesNotInChannel,
            handleAddChannelMembers,
            searchProfiles,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelAddMembers);
