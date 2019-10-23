// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {
    closeDirectChannel,
    convertChannelToPrivate,
    deleteChannel,
    getChannel,
    getChannelStats,
    handleSelectChannel,
    leaveChannel,
    loadChannelsByTeamName,
    markChannelAsFavorite,
    updateChannelNotifyProps,
    selectInitialChannel,
} from 'app/realm/actions/channel';
import {getCustomEmojisInText} from 'app/realm/actions/emoji';
import {General, Preferences} from 'app/constants';
import {getTheme} from 'app/realm/selectors/preference';
import options from 'app/store/realm_options';
import {
    areChannelMentionsIgnored,
    canDeleteChannel,
    canEditChannel,
    canManageChannelMembers,
    getUserIdFromChannelName,
    isChannelMuted,
    isChannelReadOnly,
    isFavoriteChannel,
} from 'app/realm/utils/channel';
import {mergeRoles} from 'app/realm/utils/role';
import {displayUserName, getDisplayNameSettings, isAdmin, isGuest, isSystemAdmin} from 'app/realm/utils/user';

import ChannelInfo from './channel_info';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID) || General.REALM_EMPTY_OBJECT;
    const currentUser = realm.objectForPrimaryKey('User', general.currentUserId) || General.REALM_EMPTY_OBJECT;
    const channel = realm.objectForPrimaryKey('Channel', general.currentChannelId) || General.REALM_EMPTY_OBJECT;
    const channelMember = channel?.members.filtered('id = $0', `${general.currentChannelId}-${general.currentUserId}`)[0] || General.REALM_EMPTY_OBJECT;
    const creator = realm.objectForPrimaryKey('User', channel?.creatorId) || General.REALM_EMPTY_OBJECT;
    const preferences = realm.objects('Preference');
    const roles = realm.objects('Role');

    return [general, currentUser, channel, channelMember, creator, roles, preferences];
}

function mapQueriesToProps([general, currentUser, channel, currentChannelMember, creator, roles, preferences]) {
    const currentTeam = channel?.team;
    const currentTeamMember = currentTeam?.members.filtered('id = $0', `${currentTeam?.id}-${general.currentUserId}`)[0];
    const myRoles = mergeRoles(currentUser, currentChannelMember, currentTeamMember);

    const channelIsReadOnly = isChannelReadOnly(channel, isSystemAdmin(currentChannelMember?.user), general.config?.ExperimentalTownSquareIsReadOnly);
    const viewArchivedChannels = general.config?.ExperimentalViewArchivedChannels === 'true';

    const teammateDisplayNamePref = preferences.filtered('category = $0 AND name = $1', Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT)[0];
    const themePreference = preferences.filtered(`category="${Preferences.CATEGORY_THEME}"`);
    const teammateDisplayNameSettings = getDisplayNameSettings(general.config?.TeammateNameDisplay, teammateDisplayNamePref);
    const currentChannelCreatorName = displayUserName(creator, currentUser?.locale, teammateDisplayNameSettings);

    let status;
    let isBot = false;
    let isTeammateGuest = false;
    if (channel.type === General.DM_CHANNEL) {
        const teammateId = getUserIdFromChannelName(currentUser?.id, channel?.name);
        const teammate = channel?.members.filtered('id = $0', `${channel?.id}-${teammateId}`);

        status = teammate?.status || General.OFFLINE;
        isBot = teammate?.isBot || false;
        isTeammateGuest = isGuest(teammate);
    }

    return {
        canDeleteChannel: canDeleteChannel(roles, myRoles, channel),
        canEditChannel: !channelIsReadOnly && canEditChannel(roles, myRoles, channel),
        canConvertChannel: isAdmin(currentChannelMember?.user),
        canManageUsers: canManageChannelMembers(roles, myRoles, channel),
        currentChannel: channel,
        currentChannelGuestCount: channel?.guestCount,
        currentChannelCreatorName,
        currentChannelMemberCount: channel?.memberCount,
        currentUserId: currentUser?.id,
        currentUserIsGuest: isGuest(currentUser),
        ignoreChannelMentions: areChannelMentionsIgnored(currentChannelMember),
        isBot,
        isChannelMuted: isChannelMuted(currentChannelMember, true),
        isFavorite: isFavoriteChannel(preferences, channel?.id),
        isTeammateGuest,
        locale: currentUser?.locale,
        status,
        teammateDisplayNameSettings,
        theme: getTheme([general], themePreference),
        viewArchivedChannels,
    };
}

const mapRealmDispatchToProps = {
    closeDirectChannel,
    convertChannelToPrivate,
    deleteChannel,
    getChannel,
    getChannelStats,
    getCustomEmojisInText,
    handleSelectChannel,
    leaveChannel,
    loadChannelsByTeamName,
    markChannelAsFavorite,
    selectInitialChannel,
    updateChannelNotifyProps,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(ChannelInfo);