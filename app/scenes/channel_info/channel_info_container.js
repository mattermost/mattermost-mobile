// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {goToChannelMembers, goToChannelAddMembers, goBack} from 'app/actions/navigation';
import {
    closeDMChannel,
    closeGMChannel,
    leaveChannel,
    markFavorite,
    unmarkFavorite
} from 'app/actions/views/channel';
import navigationSceneConnect from 'app/scenes/navigationSceneConnect';
import {getTheme} from 'app/selectors/preferences';

import {getChannelStats, deleteChannel} from 'mattermost-redux/actions/channels';
import {Constants} from 'mattermost-redux/constants';
import {
    getCurrentChannel,
    getCurrentChannelStats,
    getChannelsByCategory,
    canManageChannelMembers
} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getUser, getStatusForUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getUserIdFromChannelName, showDeleteOption} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isChannelAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import ChannelInfo from './channel_info';

function mapStateToProps(state, ownProps) {
    const {config, license} = state.entities.general;
    const currentChannel = getCurrentChannel(state);
    const currentChannelCreator = getUser(state, currentChannel.creator_id);
    const currentChannelCreatorName = currentChannelCreator && currentChannelCreator.username;
    const currentChannelMemberCount = getCurrentChannelStats(state) && getCurrentChannelStats(state).member_count;
    const currentUserId = getCurrentUserId(state);
    const favoriteChannels = getChannelsByCategory(state).favoriteChannels.map((f) => f.id);
    const isCurrent = currentChannel.id === state.entities.channels.currentChannelId;
    const isFavorite = favoriteChannels.indexOf(currentChannel.id) > -1;
    const leaveChannelRequest = state.requests.channels.leaveChannel;
    const roles = getCurrentUserRoles(state);

    let status;
    if (currentChannel.type === Constants.DM_CHANNEL) {
        const teammateId = getUserIdFromChannelName(currentUserId, currentChannel.name);
        status = getStatusForUserId(state, teammateId);
    }

    return {
        ...ownProps,
        canDeleteChannel: showDeleteOption(config, license, currentChannel, isAdmin(roles), isSystemAdmin(roles), isChannelAdmin(roles)),
        currentTeamId: state.entities.teams.currentTeamId,
        currentChannel,
        currentChannelCreatorName,
        currentChannelMemberCount,
        isCurrent,
        isFavorite,
        leaveChannelRequest,
        status,
        theme: getTheme(state),
        canManageUsers: canManageChannelMembers(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeDMChannel,
            closeGMChannel,
            deleteChannel,
            getChannelStats,
            goBack,
            goToChannelAddMembers,
            goToChannelMembers,
            leaveChannel,
            markFavorite,
            unmarkFavorite
        }, dispatch)
    };
}

export default navigationSceneConnect(mapStateToProps, mapDispatchToProps)(ChannelInfo);
