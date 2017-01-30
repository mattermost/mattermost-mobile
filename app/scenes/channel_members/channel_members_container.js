// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentChannel, getCurrentChannelStats} from 'service/selectors/entities/channels';
import {getMyPreferences} from 'service/selectors/entities/preferences';
import {getCurrentTeam} from 'service/selectors/entities/teams';
import {getProfilesInCurrentChannel} from 'service/selectors/entities/users';
import {getProfilesInChannel} from 'service/actions/users';

import ChannelMembers from './channel_members';

function mapStateToProps(state) {
    const currentChannelMemberCount = getCurrentChannelStats(state) && getCurrentChannelStats(state).member_count;

    return {
        currentChannel: getCurrentChannel(state),
        currentChannelMembers: getProfilesInCurrentChannel(state),
        currentChannelMemberCount,
        currentTeam: getCurrentTeam(state),
        preferences: getMyPreferences(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getProfilesInChannel
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelMembers);
