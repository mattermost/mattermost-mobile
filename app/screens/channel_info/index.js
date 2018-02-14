// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    favoriteChannel,
    getChannelStats,
    deleteChannel,
    unfavoriteChannel,
    updateChannelNotifyProps,
} from 'mattermost-redux/actions/channels';
import {getCustomEmojisInText} from 'mattermost-redux/actions/emojis';
import {selectFocusedPostId} from 'mattermost-redux/actions/posts';
import {General} from 'mattermost-redux/constants';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {
    canManageChannelMembers,
    getCurrentChannel,
    getCurrentChannelStats,
    getSortedFavoriteChannelIds,
    getMyCurrentChannelMembership,
} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getUser, getStatusForUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getUserIdFromChannelName, isChannelMuted, showDeleteOption, showManagementOptions} from 'mattermost-redux/utils/channel_utils';
import {isAdmin, isChannelAdmin, isSystemAdmin} from 'mattermost-redux/utils/user_utils';

import {
    closeDMChannel,
    closeGMChannel,
    leaveChannel,
    loadChannelsByTeamName,
} from 'app/actions/views/channel';

import ChannelInfo from './channel_info';

function mapStateToProps(state) {//eslint-disable-line complexity
    const {config, license} = state.entities.general;
    const currentChannel = getCurrentChannel(state) || {};
    const currentChannelCreator = getUser(state, currentChannel.creator_id);
    const currentChannelCreatorName = currentChannelCreator && currentChannelCreator.username;
    const currentChannelStats = getCurrentChannelStats(state);
    const currentChannelMemberCount = currentChannelStats && currentChannelStats.member_count;
    const currentChannelMember = getMyCurrentChannelMembership(state);
    const currentUserId = getCurrentUserId(state);
    const favoriteChannels = getSortedFavoriteChannelIds(state);
    const isCurrent = currentChannel.id === state.entities.channels.currentChannelId;
    const isFavorite = favoriteChannels && favoriteChannels.indexOf(currentChannel.id) > -1;
    const roles = getCurrentUserRoles(state);
    const canManageUsers = currentChannel.hasOwnProperty('id') ? canManageChannelMembers(state) : false;

    let status;
    if (currentChannel.type === General.DM_CHANNEL) {
        const teammateId = getUserIdFromChannelName(currentUserId, currentChannel.name);
        status = getStatusForUserId(state, teammateId);
    }

    let canEditChannel = showManagementOptions(config, license, currentChannel, isAdmin(roles), isSystemAdmin(roles), isChannelAdmin(roles));
    if (currentChannel.name === General.DEFAULT_CHANNEL) {
        canEditChannel = (isAdmin(roles) || isSystemAdmin(roles) || isChannelAdmin(roles)) || config.ExperimentalTownSquareIsReadOnly !== 'true';
    }

    return {
        canDeleteChannel: showDeleteOption(state, config, license, currentChannel, isAdmin(roles), isSystemAdmin(roles), isChannelAdmin(roles)),
        canEditChannel: showManagementOptions(state, config, license, currentChannel, isAdmin(roles), isSystemAdmin(roles), isChannelAdmin(roles)),
        currentChannel,
        currentChannelCreatorName,
        currentChannelMemberCount,
        currentUserId,
        isChannelMuted: isChannelMuted(currentChannelMember),
        isCurrent,
        isFavorite,
        status,
        theme: getTheme(state),
        canManageUsers,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            closeDMChannel,
            closeGMChannel,
            deleteChannel,
            getChannelStats,
            leaveChannel,
            loadChannelsByTeamName,
            favoriteChannel,
            unfavoriteChannel,
            getCustomEmojisInText,
            selectFocusedPostId,
            updateChannelNotifyProps,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelInfo);
