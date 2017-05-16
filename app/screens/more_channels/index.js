// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {General} from 'mattermost-redux/constants';
import {getChannels, joinChannel, searchChannels} from 'mattermost-redux/actions/channels';
import {getOtherChannels} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import {handleSelectChannel} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';

import MoreChannels from './more_channels';

function mapStateToProps(state, ownProps) {
    const {currentUserId} = state.entities.users;
    const {currentTeamId} = state.entities.teams;
    const {getChannels: requestStatus} = state.requests.channels;
    const {config, license} = state.entities.general;
    const roles = getCurrentUserRoles(state);
    const channels = getOtherChannels(state);

    return {
        ...ownProps,
        canCreateChannels: showCreateOption(config, license, General.PRIVATE_CHANNEL, isAdmin(roles), isSystemAdmin(roles)),
        currentUserId,
        currentTeamId,
        channels,
        theme: getTheme(state),
        requestStatus
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannel,
            joinChannel,
            getChannels,
            searchChannels
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MoreChannels);
