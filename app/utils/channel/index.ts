// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Permissions} from '@constants';
import {DEFAULT_LOCALE} from '@i18n';
import {hasPermission} from '@utils/role';

import type ChannelModel from '@typings/database/models/servers/channel';

export function getDirectChannelName(id: string, otherId: string): string {
    let handle;

    if (otherId > id) {
        handle = id + '__' + otherId;
    } else {
        handle = otherId + '__' + id;
    }

    return handle;
}

export function selectDefaultChannelForTeam<T extends Channel|ChannelModel>(channels: T[], memberships: ChannelMembership[], teamId: string, roles?: Role[], locale = DEFAULT_LOCALE) {
    let channel: T|undefined;
    let canIJoinPublicChannelsInTeam = false;

    if (roles) {
        canIJoinPublicChannelsInTeam = hasPermission(roles, Permissions.JOIN_PUBLIC_CHANNELS, true);
    }
    const defaultChannel = channels?.find((c) => c.name === General.DEFAULT_CHANNEL);
    const iAmMemberOfTheTeamDefaultChannel = Boolean(defaultChannel && memberships?.find((m) => m.channel_id === defaultChannel.id));
    const myFirstTeamChannel = channels?.filter((c) =>
        (('team_id' in c) ? c.team_id : c.teamId) === teamId &&
        c.type === General.OPEN_CHANNEL &&
        Boolean(memberships?.find((m) => c.id === m.channel_id),
        )).sort(sortChannelsByDisplayName.bind(null, locale))[0];

    if (iAmMemberOfTheTeamDefaultChannel || canIJoinPublicChannelsInTeam) {
        channel = defaultChannel;
    } else {
        channel = myFirstTeamChannel || defaultChannel;
    }

    return channel;
}

export function sortChannelsByDisplayName<T extends Channel|ChannelModel>(locale: string, a: T, b: T): number {
    // if both channels have the display_name defined
    const aDisplayName = 'display_name' in a ? a.display_name : a.displayName;
    const bDisplayName = 'display_name' in b ? b.display_name : b.displayName;
    if (aDisplayName && bDisplayName && aDisplayName !== bDisplayName) {
        return aDisplayName.toLowerCase().localeCompare(bDisplayName.toLowerCase(), locale, {numeric: true});
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
}

export function sortChannelsModelByDisplayName(locale: string, a: ChannelModel, b: ChannelModel): number {
    // if both channels have the display_name defined
    if (a.displayName && b.displayName && a.displayName !== b.displayName) {
        return a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase(), locale, {numeric: true});
    }

    return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), locale, {numeric: true});
}
