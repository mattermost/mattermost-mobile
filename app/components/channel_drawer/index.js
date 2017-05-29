// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleSelectChannel, setChannelLoading} from 'app/actions/views/channel';

import {getChannelsWithUnreadSection, getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'app/selectors/preferences';
import {getCurrentTeam, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';

import {viewChannel, markChannelAsRead} from 'mattermost-redux/actions/channels';

import ChannelDrawer from './channel_drawer.js';

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        currentTeam: getCurrentTeam(state),
        currentChannel: getCurrentChannel(state),
        channels: getChannelsWithUnreadSection(state),
        channelMembers: state.entities.channels.myMembers,
        myTeamMembers: getTeamMemberships(state),
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannel,
            viewChannel,
            markChannelAsRead,
            setChannelLoading
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelDrawer);
