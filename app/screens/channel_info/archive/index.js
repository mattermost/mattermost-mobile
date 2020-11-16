// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {
    handleSelectChannel,
    selectPenultimateChannel,
} from '@actions/views/channel';
import {deleteChannel, getChannel, unarchiveChannel} from '@mm-redux/actions/channels';
import {General} from '@mm-redux/constants';
import Permissions from '@mm-redux/constants/permissions';
import {getCurrentChannel, isCurrentChannelReadOnly} from '@mm-redux/selectors/entities/channels';
import {getConfig, getLicense, hasNewPermissions} from '@mm-redux/selectors/entities/general';
import {haveITeamPermission} from '@mm-redux/selectors/entities/roles';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getCurrentUser, getCurrentUserRoles} from '@mm-redux/selectors/entities/users';
import {showDeleteOption} from '@mm-redux/utils/channel_utils';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {isAdmin as checkIsAdmin, isChannelAdmin as checkIsChannelAdmin, isSystemAdmin as checkIsSystemAdmin} from '@mm-redux/utils/user_utils';
import {isGuest as isUserGuest} from '@utils/users';

import Archive from './archive';

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);
    const currentChannel = getCurrentChannel(state);
    const currentUser = getCurrentUser(state);
    const roles = getCurrentUserRoles(state) || '';
    const isGuest = isUserGuest(currentUser);
    const isDefaultChannel = currentChannel.name === General.DEFAULT_CHANNEL;
    const isDirectMessage = currentChannel.type === General.DM_CHANNEL;
    const isGroupMessage = currentChannel.type === General.GM_CHANNEL;
    const isAdmin = checkIsAdmin(roles);
    const isChannelAdmin = checkIsChannelAdmin(roles);
    const isSystemAdmin = checkIsSystemAdmin(roles);
    const canLeave = (!isDefaultChannel && !isDirectMessage && !isGroupMessage) || (isDefaultChannel && isGuest);
    const canDelete = showDeleteOption(state, config, license, currentChannel, isAdmin, isSystemAdmin, isChannelAdmin);
    const isArchived = currentChannel?.delete_at > 0;
    const canUnarchive = (isArchived && !isDirectMessage && !isGroupMessage);
    const viewArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';
    const {serverVersion} = state.entities.general;

    let isReadOnly = false;
    if (currentUser?.id && currentChannel?.id) {
        isReadOnly = isCurrentChannelReadOnly(state) || false;
    }

    let canUnarchiveChannel = false;
    if (hasNewPermissions(state) && isMinimumServerVersion(serverVersion, 5, 20)) {
        canUnarchiveChannel = haveITeamPermission(state, {
            team: getCurrentTeamId(state),
            permission: Permissions.MANAGE_TEAM,
        });
    }

    return {
        canArchive: (!isArchived && canLeave && canDelete && !isReadOnly),
        canUnarchive: canUnarchive && canUnarchiveChannel,
        channelId: currentChannel?.id || '',
        displayName: (currentChannel?.display_name || '').trim(),
        isPublic: currentChannel?.type === General.OPEN_CHANNEL,
        teamId: currentChannel?.team_id || '',
        viewArchivedChannels,
    };
}

const mapDispatchToProps = {
    deleteChannel,
    getChannel,
    handleSelectChannel,
    unarchiveChannel,
    selectPenultimateChannel,
};

export default connect(mapStateToProps, mapDispatchToProps)(Archive);
