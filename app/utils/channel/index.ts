// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type IntlShape} from 'react-intl';

import {Channel, General, Permissions} from '@constants';
import {DEFAULT_LOCALE} from '@i18n';
import {generateId} from '@utils/general';
import {hasPermission} from '@utils/role';
import {cleanUpUrlable} from '@utils/url';

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

export function isDMorGM(channel: Channel | ChannelModel): boolean {
    return isTypeDMorGM(channel.type);
}

const DIRECT_TYPES: string[] = [General.GM_CHANNEL, General.DM_CHANNEL];

export function isTypeDMorGM(channelType: ChannelType | undefined): boolean {
    return Boolean(channelType && DIRECT_TYPES.includes(channelType));
}

export function isArchived(channel: Channel | ChannelModel): boolean {
    const deleteAt = 'delete_at' in channel ? channel.delete_at : channel.deleteAt;
    return deleteAt > 0;
}

export function selectDefaultChannelForTeam<T extends Channel|ChannelModel>(channels: T[], memberships: ChannelMembership[], teamId: string, roles?: Role[], locale = DEFAULT_LOCALE) {
    let channel: T|undefined;
    let canIJoinPublicChannelsInTeam = false;

    if (roles) {
        canIJoinPublicChannelsInTeam = hasPermission(roles, Permissions.JOIN_PUBLIC_CHANNELS);
    }
    const defaultChannel = channels?.find(isDefaultChannel);
    const membershipIds = new Set(memberships.map((m) => m.channel_id));
    const iAmMemberOfTheTeamDefaultChannel = Boolean(defaultChannel && membershipIds.has(defaultChannel.id));
    const myFirstTeamChannel = channels?.filter((c) =>
        (('team_id' in c) ? c.team_id : c.teamId) === teamId &&
        c.type === General.OPEN_CHANNEL &&
        membershipIds.has(c.id),
    ).sort(sortChannelsByDisplayName.bind(null, locale))[0];

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

const displayNameValidationMessages = defineMessages({
    display_name_required: {
        id: 'mobile.rename_channel.display_name_required',
        defaultMessage: 'Channel name is required',
    },
    display_name_maxLength: {
        id: 'mobile.rename_channel.display_name_maxLength',
        defaultMessage: 'Channel name must be less than {maxLength, number} characters',
    },
    display_name_minLength: {
        id: 'mobile.rename_channel.display_name_minLength',
        defaultMessage: 'Channel name must be {minLength, number} or more characters',
    },
});

export const validateDisplayName = (intl: IntlShape, displayName: string): {error: string} => {
    let errorMessage;
    switch (true) {
        case !displayName:
            errorMessage = intl.formatMessage(displayNameValidationMessages.display_name_required);
            break;
        case displayName.length > Channel.MAX_CHANNEL_NAME_LENGTH:
            errorMessage = intl.formatMessage(
                displayNameValidationMessages.display_name_maxLength,
                {maxLength: Channel.MAX_CHANNEL_NAME_LENGTH});
            break;
        case displayName.length < Channel.MIN_CHANNEL_NAME_LENGTH:
            errorMessage = intl.formatMessage(
                displayNameValidationMessages.display_name_minLength,
                {minLength: Channel.MIN_CHANNEL_NAME_LENGTH});
            break;

        default:
            errorMessage = '';
            break;
    }
    return {error: errorMessage};
};

export function generateChannelNameFromDisplayName(displayName: string) {
    let name = cleanUpUrlable(displayName);
    if (name === '') {
        name = generateId();
    }
    return name;
}

export function compareNotifyProps(propsA: Partial<ChannelNotifyProps>, propsB: Partial<ChannelNotifyProps>): boolean {
    if (
        propsA.desktop !== propsB.desktop ||
        propsA.email !== propsB.email ||
        propsA.mark_unread !== propsB.mark_unread ||
        propsA.push !== propsB.push ||
        propsA.ignore_channel_mentions !== propsB.ignore_channel_mentions
    ) {
        return false;
    }

    return true;
}

export function filterChannelsMatchingTerm(channels: Channel[], term: string): Channel[] {
    const lowercasedTerm = term.toLowerCase();

    return channels.filter((channel: Channel): boolean => {
        if (!channel) {
            return false;
        }
        const name = (channel.name || '').toLowerCase();
        const displayName = (channel.display_name || '').toLowerCase();

        return name.startsWith(lowercasedTerm) ||
            displayName.startsWith(lowercasedTerm);
    });
}

export function isDefaultChannel(channel: Channel | ChannelModel | undefined): boolean {
    return channel?.name === General.DEFAULT_CHANNEL;
}
