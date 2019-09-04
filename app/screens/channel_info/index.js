// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    favoriteChannel,
    getChannelStats,
    getChannel,
    deleteChannel,
    unfavoriteChannel,
    updateChannelNotifyProps,
} from 'mattermost-redux/actions/channels';
import {getCustomEmojisInText} from 'mattermost-redux/actions/emojis';
import {selectFocusedPostId} from 'mattermost-redux/actions/posts';
import {clearPinnedPosts} from 'mattermost-redux/actions/search';
import {General} from 'mattermost-redux/constants';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {
    canManageChannelMembers,
    getCurrentChannel,
    getCurrentChannelStats,
    getSortedFavoriteChannelIds,
    getMyCurrentChannelMembership,
    isCurrentChannelReadOnly,
} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId, getUser, getStatusForUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {areChannelMentionsIgnored, getUserIdFromChannelName, isChannelMuted, showDeleteOption, showManagementOptions} from 'mattermost-redux/utils/channel_utils';
import {isAdmin as checkIsAdmin, isChannelAdmin as checkIsChannelAdmin, isSystemAdmin as checkIsSystemAdmin} from 'mattermost-redux/utils/user_utils';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';
import {isTimezoneEnabled} from 'mattermost-redux/selectors/entities/timezone';
import {getUserCurrentTimezone} from 'mattermost-redux/utils/timezone_utils';

import {
    popTopScreen,
    goToScreen,
    popToRoot,
    dismissModal,
    showModalOverCurrentContext,
} from 'app/actions/navigation';
import {
    closeDMChannel,
    closeGMChannel,
    handleSelectChannel,
    leaveChannel,
    loadChannelsByTeamName,
    selectPenultimateChannel,
    setChannelDisplayName,
} from 'app/actions/views/channel';
import {isLandscape} from 'app/selectors/device';
import {isGuest} from 'app/utils/users';

import ChannelInfo from './channel_info';

function mapStateToProps(state) {
    const config = getConfig(state);
    const license = getLicense(state);
    const currentChannel = getCurrentChannel(state) || {};
    const currentChannelCreator = getUser(state, currentChannel.creator_id);
    const currentChannelCreatorName = currentChannelCreator && currentChannelCreator.username;
    const currentChannelStats = getCurrentChannelStats(state);
    const currentChannelMemberCount = currentChannelStats && currentChannelStats.member_count;
    let currentChannelGuestCount = (currentChannelStats && currentChannelStats.guest_count) || 0;
    const currentChannelMember = getMyCurrentChannelMembership(state);
    const currentUserId = getCurrentUserId(state);
    const favoriteChannels = getSortedFavoriteChannelIds(state);
    const isCurrent = currentChannel.id === state.entities.channels.currentChannelId;
    const isFavorite = favoriteChannels && favoriteChannels.indexOf(currentChannel.id) > -1;
    const roles = getCurrentUserRoles(state);
    let canManageUsers = currentChannel.hasOwnProperty('id') ? canManageChannelMembers(state) : false;
    if (currentChannel.group_constrained) {
        canManageUsers = false;
    }
    const currentUser = getUser(state, currentUserId);
    const currentUserIsGuest = isGuest(currentUser);

    let status;
    let isBot = false;
    if (currentChannel.type === General.DM_CHANNEL) {
        const teammateId = getUserIdFromChannelName(currentUserId, currentChannel.name);
        const teammate = getUser(state, teammateId);
        status = getStatusForUserId(state, teammateId);
        if (teammate && teammate.is_bot) {
            isBot = true;
        }
        if (isGuest(teammate)) {
            currentChannelGuestCount = 1;
        }
    }

    const isAdmin = checkIsAdmin(roles);
    const isChannelAdmin = checkIsChannelAdmin(roles);
    const isSystemAdmin = checkIsSystemAdmin(roles);

    const channelIsReadOnly = isCurrentChannelReadOnly(state);
    const canEditChannel = !channelIsReadOnly && showManagementOptions(state, config, license, currentChannel, isAdmin, isSystemAdmin, isChannelAdmin);
    const viewArchivedChannels = config.ExperimentalViewArchivedChannels === 'true';

    const enableTimezone = isTimezoneEnabled(state);
    let timeZone = null;
    if (enableTimezone) {
        timeZone = getUserCurrentTimezone(currentUser.timezone);
    }

    return {
        canDeleteChannel: showDeleteOption(state, config, license, currentChannel, isAdmin, isSystemAdmin, isChannelAdmin),
        viewArchivedChannels,
        canEditChannel,
        currentChannel,
        currentChannelCreatorName,
        currentChannelMemberCount,
        currentChannelGuestCount,
        currentUserId,
        currentUserIsGuest,
        isChannelMuted: isChannelMuted(currentChannelMember),
        ignoreChannelMentions: areChannelMentionsIgnored(currentChannelMember && currentChannelMember.notify_props, currentUser.notify_props),
        isCurrent,
        isFavorite,
        status,
        theme: getTheme(state),
        canManageUsers,
        isBot,
        isLandscape: isLandscape(state),
        timeZone,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            clearPinnedPosts,
            closeDMChannel,
            closeGMChannel,
            deleteChannel,
            getChannelStats,
            getChannel,
            leaveChannel,
            loadChannelsByTeamName,
            favoriteChannel,
            unfavoriteChannel,
            getCustomEmojisInText,
            selectFocusedPostId,
            updateChannelNotifyProps,
            selectPenultimateChannel,
            setChannelDisplayName,
            handleSelectChannel,
            popTopScreen,
            goToScreen,
            popToRoot,
            dismissModal,
            showModalOverCurrentContext,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelInfo);
