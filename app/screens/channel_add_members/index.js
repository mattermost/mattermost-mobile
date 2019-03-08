// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTeamStats} from 'mattermost-redux/actions/teams';
import {getProfilesNotInChannel, searchProfiles} from 'mattermost-redux/actions/users';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId, getProfilesNotInCurrentChannel} from 'mattermost-redux/selectors/entities/users';

import {handleAddChannelMembers} from 'app/actions/views/channel_add_members';

import ChannelAddMembers from './channel_add_members';

function mapStateToProps(state) {
    return {
        currentChannelId: getCurrentChannelId(state),
        currentTeamId: getCurrentTeamId(state),
        currentUserId: getCurrentUserId(state),
        profilesNotInChannel: getProfilesNotInCurrentChannel(state),
        theme: getTheme(state),
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
