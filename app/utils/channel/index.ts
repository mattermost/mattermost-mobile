// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Channel, General, Permissions} from '@constants';
import {t, DEFAULT_LOCALE} from '@i18n';
import {hasPermission} from '@utils/role';

import type {IntlShape} from 'react-intl';

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

const messages = {
    display_name_required: {
        id: t('mobile.rename_channel.display_name_required'),
        defaultMessage: 'Channel name is required',
    },
    display_name_maxLength: {
        id: t('mobile.rename_channel.display_name_maxLength'),
        defaultMessage: 'Channel name must be less than {maxLength, number} characters',
    },
    display_name_minLength: {
        id: t('mobile.rename_channel.display_name_minLength'),
        defaultMessage: 'Channel name must be {minLength, number} or more characters',
    },
};

export const validateDisplayName = (intl: IntlShape, displayName: string): {error: string} => {
    let errorMessage;
    switch (true) {
        case !displayName:
            errorMessage = intl.formatMessage(messages.display_name_required);
            break;
        case displayName.length > Channel.MAX_CHANNELNAME_LENGTH:
            errorMessage = intl.formatMessage(
                messages.display_name_maxLength,
                {maxLength: Channel.MAX_CHANNELNAME_LENGTH});
            break;
        case displayName.length < Channel.MIN_CHANNELNAME_LENGTH:
            errorMessage = intl.formatMessage(
                messages.display_name_minLength,
                {minLength: Channel.MIN_CHANNELNAME_LENGTH});
            break;

        default:
            errorMessage = '';
    }
    return {error: errorMessage};
};
