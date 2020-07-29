// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {loadChannelsForTeam, selectInitialChannel} from '@actions/views/channel';
import {recordLoadTime} from '@actions/views/root';
import {selectDefaultTeam} from '@actions/views/select_team';
import {ViewTypes} from '@constants';
import {getChannelStats} from '@mm-redux/actions/channels';
import {Client4} from '@mm-redux/client';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getServerVersion} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeam} from '@mm-redux/selectors/entities/teams';
import {getCurrentUserId, getCurrentUserRoles, shouldShowTermsOfService} from '@mm-redux/selectors/entities/users';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {isSystemAdmin as checkIsSystemAdmin} from '@mm-redux/utils/user_utils';

import Channel from './channel';

function mapStateToProps(state) {
    const currentTeam = getCurrentTeam(state);
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';
    const isSystemAdmin = checkIsSystemAdmin(roles);
    const serverVersion = Client4.getServerVersion() || getServerVersion(state);

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
        currentChannelId: getCurrentChannelId(state),
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
            getChannelStats,
            loadChannelsForTeam,
            selectDefaultTeam,
            selectInitialChannel,
            recordLoadTime,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
