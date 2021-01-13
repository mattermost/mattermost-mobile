// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {handleSelectChannel, loadChannelsForTeam, selectInitialChannel} from '@actions/views/channel';
import {recordLoadTime} from '@actions/views/root';
import {selectDefaultTeam} from '@actions/views/select_team';
import {ViewTypes} from '@constants';
import {getChannelStats, joinChannel} from '@mm-redux/actions/channels';
import {Client4} from '@mm-redux/client';
import {getCurrentChannel, getMyChannelMemberships} from '@mm-redux/selectors/entities/channels';
import {getServerVersion} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeam} from '@mm-redux/selectors/entities/teams';
import {getCurrentUserId, getCurrentUserRoles, shouldShowTermsOfService} from '@mm-redux/selectors/entities/users';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {isSystemAdmin as checkIsSystemAdmin} from '@mm-redux/utils/user_utils';

import Channel from './channel';

function mapStateToProps(state) {
    const currentTeam = getCurrentTeam(state);
    const currentUserId = getCurrentUserId(state);
    const roles = currentUserId ? getCurrentUserRoles(state) : '';
    const isSystemAdmin = checkIsSystemAdmin(roles);
    const serverVersion = Client4.getServerVersion() || getServerVersion(state);

    const currentChannel = getCurrentChannel(state);
    const currentChannelId = currentChannel?.id;
    const memberShips = getMyChannelMemberships(state) || {};

    let isSupportedServer = true;
    if (serverVersion) {
        isSupportedServer = isMinimumServerVersion(
            serverVersion,
            ViewTypes.RequiredServer.MAJOR_VERSION,
            ViewTypes.RequiredServer.MIN_VERSION,
            ViewTypes.RequiredServer.PATCH_VERSION,
        );
    }

    return {
        currentTeamId: currentTeam?.id,
        currentChannel,
        currentChannelId,
        currentUserId,
        isMember: Boolean(memberShips[currentChannelId]),
        isSupportedServer,
        isSystemAdmin,
        teamName: currentTeam?.display_name,
        theme: getTheme(state),
        showTermsOfService: shouldShowTermsOfService(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            joinChannel,
            getChannelStats,
            handleSelectChannel,
            loadChannelsForTeam,
            selectDefaultTeam,
            selectInitialChannel,
            recordLoadTime,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
