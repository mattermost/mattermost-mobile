// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {handleSelectChannel, setChannelDisplayName} from '@actions/views/channel';
import {General} from '@mm-redux/constants';
import {getArchivedChannels, getChannels, joinChannel, searchChannels} from '@mm-redux/actions/channels';
import {getChannelsInCurrentTeam, getMyChannelMemberships} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId, getCurrentUserRoles} from '@mm-redux/selectors/entities/users';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {showCreateOption} from '@mm-redux/utils/channel_utils';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {isAdmin, isSystemAdmin} from '@mm-redux/utils/user_utils';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getConfig, getLicense} from '@mm-redux/selectors/entities/general';

import MoreChannels from './more_channels';

const joinablePublicChannels = createSelector(
    getChannelsInCurrentTeam,
    getMyChannelMemberships,
    (channels, myMembers) => {
        return channels.filter((c) => {
            return (!myMembers[c.id] && c.type === General.OPEN_CHANNEL && c.delete_at === 0);
        });
    },
);

const teamArchivedChannels = createSelector(
    getChannelsInCurrentTeam,
    (channels) => {
        return channels.filter((c) => c.delete_at !== 0);
    },
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
        canShowArchivedChannels,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getArchivedChannels,
            getChannels,
            handleSelectChannel,
            joinChannel,
            searchChannels,
            setChannelDisplayName,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MoreChannels);
