// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, Preferences} from 'app/constants';
import options from 'app/store/realm_options';
import {getChannelDisplayName, isChannelMuted, isOwnDirectMessage} from 'app/realm/utils/channel';
import {getDisplayNameSettings, isGuest} from 'app/realm/utils/user';

import ChannelTitle from './channel_title';

function mapPropsToQueries(realm, ownProps) {
    const {channelId} = ownProps;
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const channel = realm.objectForPrimaryKey('Channel', channelId) || General.REALM_EMPTY_OBJECT;
    const channelMember = channel?.members.filtered('id = $0', `${general.currentChannelId}-${general.currentUserId}`)[0] || General.REALM_EMPTY_OBJECT;
    const displaySettings = realm.objects('Preference').filtered('category = $0 AND name = $1', Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT);
    const currentUser = realm.objectForPrimaryKey('User', general.currentUserId);

    return [general, displaySettings, channel, channelMember, currentUser];
}

function mapQueriesToProps([general, displaySettings, channel, channelMember, currentUser]) {
    const currentUserId = general.currentUserId;
    const teammateDisplayNameSetting = getDisplayNameSettings(general.config?.TeammateNameDisplay, displaySettings[0]);

    let isTeammateGuest = false;
    let userId = currentUserId;
    let isOwnDM = false;
    if (channel?.type === General.DM_CHANNEL) {
        const teammate = channel.members.filtered('user.id != $0', currentUserId)[0];
        isOwnDM = isOwnDirectMessage(channel, currentUserId);

        isTeammateGuest = isGuest(teammate);

        if (isOwnDM) {
            userId = '';
        }
    }

    return {
        channelType: channel?.type || General.OPEN_CHANNEL,
        displayName: getChannelDisplayName(channel, userId, currentUser?.locale, teammateDisplayNameSetting),
        hasGuests: channel.guestCount ? channel.guestCount > 0 : false,
        isArchived: channel.deleteAt ? channel.deleteAt !== 0 : false,
        isChannelMuted: isChannelMuted(channelMember),
        isGuest: isTeammateGuest,
        isOwnDM,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(ChannelTitle);
