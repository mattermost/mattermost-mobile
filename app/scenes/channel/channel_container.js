// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    loadChannelsIfNecessary,
    loadProfilesAndTeamMembersForDMSidebar,
    selectInitialChannel
} from 'app/actions/views/channel';
import {openChannelDrawer} from 'app/actions/views/drawer';

import {getCurrentChannel} from 'service/selectors/entities/channels';
import {getTheme} from 'service/selectors/entities/preferences';
import {getCurrentTeam} from 'service/selectors/entities/teams';

import {Constants} from 'service/constants';
import {displayUsername} from 'service/utils/user_utils';
import {getUserIdFromChannelName} from 'service/utils/channel_utils';

import Channel from './channel.js';

function mapStateToProps(state, ownProps) {
    const channel = getCurrentChannel(state);
    const currentChannel = {...channel};
    const {currentId, profiles} = state.entities.users;
    const {myPreferences} = state.entities.preferences;

    if (channel && channel.type === Constants.DM_CHANNEL) {
        const otherUserId = getUserIdFromChannelName(currentId, currentChannel);
        currentChannel.display_name = displayUsername(profiles[otherUserId], myPreferences);
    }

    return {
        ...ownProps,
        currentTeam: getCurrentTeam(state),
        currentChannel,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadChannelsIfNecessary,
            loadProfilesAndTeamMembersForDMSidebar,
            selectInitialChannel,
            openChannelDrawer
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
