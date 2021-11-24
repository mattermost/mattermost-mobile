// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Permissions, Preferences} from '@constants';
import {getPreferenceAsBool} from '@helpers/api/preference';
import {DEFAULT_LOCALE} from '@i18n';
import {hasPermission} from '@utils/role';

import {getUserIdFromChannelName} from '../user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type RoleModel from '@typings/database/models/servers/role';

export function isDirectChannelVisible(userId: string, myPreferences: PreferenceModel[], channel: ChannelModel) {
    const channelId = getUserIdFromChannelName(userId, channel.name);
    return getPreferenceAsBool(myPreferences, Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, channelId, false);
}

export function isGroupChannelVisible(myPreferences: PreferenceModel[], channel: ChannelModel) {
    return getPreferenceAsBool(myPreferences, Preferences.CATEGORY_GROUP_CHANNEL_SHOW, channel.id);
}

export function selectDefaultChannelForTeam(channels: Channel[], memberships: ChannelMembership[], teamId: string, roles?: Role[], locale = DEFAULT_LOCALE) {
    let channel: Channel|undefined;
    let canIJoinPublicChannelsInTeam = false;

    if (roles) {
        canIJoinPublicChannelsInTeam = hasPermission(roles, Permissions.JOIN_PUBLIC_CHANNELS, true);
    }
    const defaultChannel = channels?.find((c) => c.name === General.DEFAULT_CHANNEL);
    const iAmMemberOfTheTeamDefaultChannel = Boolean(defaultChannel && memberships?.find((m) => m.channel_id === defaultChannel.id));
    const myFirstTeamChannel = channels?.filter((c) => c.team_id === teamId && c.type === General.OPEN_CHANNEL && Boolean(memberships?.find((m) => c.id === m.channel_id))).
        sort(sortChannelsByDisplayName.bind(null, locale))[0];

    if (iAmMemberOfTheTeamDefaultChannel || canIJoinPublicChannelsInTeam) {
        channel = defaultChannel;
    } else {
        channel = myFirstTeamChannel || defaultChannel;
    }

    return channel;
}

export function sortChannelsByDisplayName(locale: string, a: Channel, b: Channel): number {
    // if both channels have the display_name defined
    if (a.display_name && b.display_name && a.display_name !== b.display_name) {
        return a.display_name.toLowerCase().localeCompare(b.display_name.toLowerCase(), locale, {numeric: true});
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
}

export function selectDefaultChannelForTeamFromModel(channels: ChannelModel[], memberships: ChannelMembershipModel[], roles?: RoleModel[], locale = DEFAULT_LOCALE) {
    let channel: ChannelModel|undefined;
    let canIJoinPublicChannelsInTeam = false;

    if (roles) {
        canIJoinPublicChannelsInTeam = hasPermission(roles, Permissions.JOIN_PUBLIC_CHANNELS, true);
    }
    const defaultChannel = channels?.find((c) => c.name === General.DEFAULT_CHANNEL);
    const iAmMemberOfTheTeamDefaultChannel = Boolean(defaultChannel && memberships?.find((m) => m.channelId === defaultChannel.id));
    const myFirstTeamChannel = channels?.filter((c) => c.type === General.OPEN_CHANNEL && Boolean(memberships?.find((m) => c.id === m.channelId))).
        sort(sortChannelsModelByDisplayName.bind(null, locale))[0];

    if (iAmMemberOfTheTeamDefaultChannel || canIJoinPublicChannelsInTeam) {
        channel = defaultChannel;
    } else {
        channel = myFirstTeamChannel || defaultChannel;
    }

    return channel;
}

export function sortChannelsModelByDisplayName(locale: string, a: ChannelModel, b: ChannelModel): number {
    // if both channels have the display_name defined
    if (a.displayName && b.displayName && a.displayName !== b.displayName) {
        return a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase(), locale, {numeric: true});
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
}
