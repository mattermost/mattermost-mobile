// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {loadChannelsForTeam, selectInitialChannel} from '@actions/views/channel';
import {selectDefaultTeam} from '@actions/views/select_team';
import {Client4} from '@client/rest';
import {ViewTypes} from '@constants';
import {getChannelStats} from '@mm-redux/actions/channels';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getServerVersion} from '@mm-redux/selectors/entities/general';
import {getSelectedPost} from '@mm-redux/selectors/entities/posts';
import {getTheme, isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeam} from '@mm-redux/selectors/entities/teams';
import {getCurrentUserId, getCurrentUserRoles, shouldShowTermsOfService} from '@mm-redux/selectors/entities/users';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {isSystemAdmin as checkIsSystemAdmin} from '@mm-redux/utils/user_utils';
import {batchLoadCalls} from '@mmproducts/calls/store/actions/calls';
import {
    isCallsPluginEnabled,
    isSupportedServer as isSupportedServerForCalls,
} from '@mmproducts/calls/store/selectors/calls';
import {getViewingGlobalThreads} from '@selectors/threads';

import Channel from './channel';

function mapStateToProps(state) {
    const currentTeam = getCurrentTeam(state);
    const currentUserId = getCurrentUserId(state);
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

    const currentTeamId = currentTeam?.delete_at === 0 ? currentTeam?.id : '';
    const currentChannelId = currentTeam?.delete_at === 0 ? getCurrentChannelId(state) : '';
    const collapsedThreadsEnabled = isCollapsedThreadsEnabled(state);
    const isSupportedServerCalls = isSupportedServerForCalls(state);
    const isCallsEnabled = isCallsPluginEnabled(state);

    return {
        currentChannelId,
        currentTeamId,
        currentUserId,
        isSupportedServer,
        isSystemAdmin,
        selectedPost: getSelectedPost(state),
        collapsedThreadsEnabled,
        showTermsOfService: shouldShowTermsOfService(state),
        teamName: currentTeam?.display_name,
        theme: getTheme(state),
        viewingGlobalThreads: collapsedThreadsEnabled && getViewingGlobalThreads(state),
        isSupportedServerCalls,
        isCallsEnabled,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getChannelStats,
            loadChannelsForTeam,
            selectDefaultTeam,
            selectInitialChannel,
            batchLoadCalls,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Channel);
