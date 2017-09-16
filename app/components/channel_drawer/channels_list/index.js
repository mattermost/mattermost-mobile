// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';

import {getChannelsWithUnreadSection, getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeam, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';

import ChannelsList from './channels_list';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        channels: getChannelsWithUnreadSection(state),
        channelMembers: state.entities.channels.myMembers,
        currentChannel: getCurrentChannel(state),
        currentTeam: getCurrentTeam(state),
        myTeamMembers: getTeamMemberships(state),
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(ChannelsList);
