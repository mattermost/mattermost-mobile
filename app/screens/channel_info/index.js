// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    convertChannelToPrivate,
    favoriteChannel,
    getChannelStats,
    getChannel,
    deleteChannel,
    unarchiveChannel,
    unfavoriteChannel,
    updateChannelNotifyProps,
    handleSelectChannel,
    removeMeFromChannel,
    getChannelsByTeamName,
    selectLastViewedChannelForTeam,
    selectPenultimateViewedChannelForTeam,
    setChannelDisplayName,
} from '@actions/channels';
import {toggleDMChannel, toggleGMChannel} from '@mm-redux/actions/preferences';
import {getCustomEmojisInText} from '@mm-redux/actions/emojis';
import {selectFocusedPostId} from '@mm-redux/actions/posts';
import {clearPinnedPosts} from '@mm-redux/actions/search';
import {General} from '@mm-redux/constants';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {
    canManageChannelMembers,
    getCurrentChannel,
    getCurrentChannelStats,
    getSortedFavoriteChannelIds,
    getMyCurrentChannelMembership,
    isCurrentChannelReadOnly,
} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId, getUser, getStatusForUserId, getCurrentUserRoles} from '@mm-redux/selectors/entities/users';
import {areChannelMentionsIgnored, getUserIdFromChannelName, isChannelMuted, showDeleteOption, showManagementOptions} from '@mm-redux/utils/channel_utils';
import {isAdmin as checkIsAdmin, isChannelAdmin as checkIsChannelAdmin, isSystemAdmin as checkIsSystemAdmin} from '@mm-redux/utils/user_utils';
import {getConfig, getLicense, hasNewPermissions} from '@mm-redux/selectors/entities/general';
import {isTimezoneEnabled} from '@mm-redux/selectors/entities/timezone';
import {getUserCurrentTimezone} from '@mm-redux/utils/timezone_utils';
import Permissions from '@mm-redux/constants/permissions';
import {haveITeamPermission} from '@mm-redux/selectors/entities/roles';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';

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
    const currentChannelPinnedPostCount = currentChannelStats && currentChannelStats.pinnedpost_count;
    let currentChannelGuestCount = (currentChannelStats && currentChannelStats.guest_count) || 0;
    const currentChannelMember = getMyCurrentChannelMembership(state);
    const currentUserId = getCurrentUserId(state);
    const favoriteChannels = getSortedFavoriteChannelIds(state);
    const isCurrent = currentChannel.id === state.entities.channels.currentChannelId;
    const isFavorite = favoriteChannels && favoriteChannels.indexOf(currentChannel.id) > -1;
    const roles = getCurrentUserRoles(state);
    const {serverVersion} = state.entities.general;
    let canManageUsers = currentChannel.hasOwnProperty('id') ? canManageChannelMembers(state) : false;
    if (currentChannel.group_constrained) {
        canManageUsers = false;
    }
    const currentUser = getUser(state, currentUserId);
    const currentUserIsGuest = isGuest(currentUser);

    let status;
    let isBot = false;
    let isTeammateGuest = false;
    if (currentChannel.type === General.DM_CHANNEL) {
        const teammateId = getUserIdFromChannelName(currentUserId, currentChannel.name);
        const teammate = getUser(state, teammateId);
        status = getStatusForUserId(state, teammateId);
        if (teammate && teammate.is_bot) {
            isBot = true;
        }
        if (isGuest(teammate)) {
            isTeammateGuest = true;
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

    let canUnarchiveChannel = false;
    if (hasNewPermissions(state) && isMinimumServerVersion(serverVersion, 5, 20)) {
        canUnarchiveChannel = haveITeamPermission(state, {
            team: getCurrentTeamId(state),
            permission: Permissions.MANAGE_TEAM,
        });
    }

    return {
        canDeleteChannel: showDeleteOption(state, config, license, currentChannel, isAdmin, isSystemAdmin, isChannelAdmin),
        canUnarchiveChannel,
        canConvertChannel: isAdmin,
        viewArchivedChannels,
        canEditChannel,
        currentChannel,
        currentChannelCreatorName,
        currentChannelMemberCount,
        currentChannelGuestCount,
        currentChannelPinnedPostCount,
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
        isTeammateGuest,
        isLandscape: isLandscape(state),
        timeZone,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            clearPinnedPosts,
            toggleDMChannel,
            toggleGMChannel,
            convertChannelToPrivate,
            deleteChannel,
            unarchiveChannel,
            getChannelStats,
            getChannel,
            removeMeFromChannel,
            getChannelsByTeamName,
            favoriteChannel,
            unfavoriteChannel,
            getCustomEmojisInText,
            selectFocusedPostId,
            updateChannelNotifyProps,
            selectLastViewedChannelForTeam,
            selectPenultimateViewedChannelForTeam,
            setChannelDisplayName,
            handleSelectChannel,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelInfo);
