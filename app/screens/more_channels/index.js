// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';
import {isLandscape} from 'app/selectors/device';
import {General} from 'mattermost-redux/constants';
import {getChannels, joinChannel, searchChannels} from 'mattermost-redux/actions/channels';
import {getChannelsInCurrentTeam, getMyChannelMemberships} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';

import {setButtons, dismissModal, goToScreen} from 'app/actions/navigation';
import {handleSelectChannel, setChannelDisplayName} from 'app/actions/views/channel';

import MoreChannels from './more_channels';

const joinableChannels = createSelector(
    getChannelsInCurrentTeam,
    getMyChannelMemberships,
    (channels, myMembers) => {
        return channels.filter((c) => {
            return (!myMembers[c.id] && c.type === General.OPEN_CHANNEL);
        });
    }
);

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);
    const roles = getCurrentUserRoles(state);
    const channels = joinableChannels(state);
    const currentTeamId = getCurrentTeamId(state);

    return {
        canCreateChannels: showCreateOption(state, config, license, currentTeamId, General.OPEN_CHANNEL, isAdmin(roles), isSystemAdmin(roles)),
        currentUserId: getCurrentUserId(state),
        currentTeamId,
        channels,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannel,
            joinChannel,
            getChannels,
            searchChannels,
            setChannelDisplayName,
            setButtons,
            dismissModal,
            goToScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MoreChannels);
