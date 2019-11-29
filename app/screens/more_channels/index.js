// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';
import {isLandscape} from 'app/selectors/device';
import {General} from 'mattermost-redux/constants';
import {joinChannel, searchChannels} from 'mattermost-redux/actions/channels';
import {getChannelsInCurrentTeam, getMyChannelMemberships} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {showCreateOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';

import {handleSelectChannel, setChannelDisplayName, loadPublicAndArchivedChannels} from 'app/actions/views/channel';

import MoreChannels from './more_channels';

import {isMinimumServerVersion} from 'mattermost-redux/utils/helpers';

const joinablePublicChannels = createSelector(
    getChannelsInCurrentTeam,
    getMyChannelMemberships,
    (channels, myMembers) => {
        return channels.filter((c) => {
            return (!myMembers[c.id] && c.type === General.OPEN_CHANNEL && c.delete_at === 0);
        });
    }
);

const teamArchivedChannels = createSelector(
    getChannelsInCurrentTeam,
    (channels) => {
        return channels.filter((c) => c.delete_at !== 0);
    }
);

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);
    const roles = getCurrentUserRoles(state);
    const channels = joinablePublicChannels(state);
    const archivedChannels = teamArchivedChannels(state);
    const currentTeamId = getCurrentTeamId(state);
    const canShowArchivedChannels = config.ExperimentalViewArchivedChannels === 'true' &&
        isMinimumServerVersion(state.entities.general.serverVersion, 5, 18);

    return {
        canCreateChannels: showCreateOption(state, config, license, currentTeamId, General.OPEN_CHANNEL, isAdmin(roles), isSystemAdmin(roles)),
        currentUserId: getCurrentUserId(state),
        currentTeamId,
        channels,
        archivedChannels,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
        canShowArchivedChannels,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannel,
            joinChannel,
            loadPublicAndArchivedChannels,
            searchChannels,
            setChannelDisplayName,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MoreChannels);
