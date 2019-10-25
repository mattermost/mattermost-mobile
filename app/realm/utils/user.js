// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Preferences, Roles} from 'app/constants';
import {getLocalizedMessage} from 'app/i18n';
import {haveRole} from 'app/realm/utils/role';

export function userDataToRealm(user) {
    return {
        id: user.id,
        createAt: user.create_at,
        updateAt: user.update_at,
        deleteAt: user.delete_at,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: user.roles,
        notifyProps: user.notify_props ? JSON.stringify(user.notify_props) : '',
        locale: user.locale,
        position: user.position,
        timezone: user.timezone ? JSON.stringify(user.timezone) : '',
        lastPictureUpdate: user.last_picture_update || user.update_at || user.create_at,
        status: user.status,
        termsOfServiceId: user.terms_of_service_id,
        termsOfServiceCreateAt: user.terms_of_service_create_at,
        isBot: user.is_bot || false,
    };
}

export function isGuest(user) {
    return haveRole(user?.roles, Roles.SYSTEM_GUEST_ROLE);
}

export function isAdmin(user) {
    return isSystemAdmin(user) || isTeamAdmin(user);
}

export function isChannelAdmin(user) {
    return haveRole(user?.roles, Roles.CHANNEL_ADMIN_ROLE);
}

export function isTeamAdmin(user) {
    return haveRole(user?.roles, Roles.TEAM_ADMIN_ROLE);
}

export function isSystemAdmin(user) {
    return haveRole(user?.roles, Roles.SYSTEM_ADMIN_ROLE);
}

export function displayUserName(user, locale, teammateNameDisplaySetting, useFallbackUsername = true) {
    let name = useFallbackUsername ? getLocalizedMessage(locale || General.DEFAULT_LOCALE, 'channel_loader.someone') : '';

    if (user) {
        switch (teammateNameDisplaySetting) {
        case Preferences.DISPLAY_PREFER_NICKNAME:
            name = user.nickname || user.fullName;
            break;
        case Preferences.DISPLAY_PREFER_FULL_NAME:
            name = user.fullName;
            break;
        default:
            name = user.username;
            break;
        }

        if (!name || name.trim().length === 0) {
            name = user.username;
        }
    }

    return name;
}

export function getDisplayNameSettings(teammateNameDisplaySetting, teammateNameDisplayPreference) {
    if (teammateNameDisplayPreference) {
        return teammateNameDisplayPreference.value;
    } else if (teammateNameDisplaySetting) {
        return teammateNameDisplaySetting;
    }
    return Preferences.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME;
}

export function sortUsersByDisplayName(locale, teammateNameDisplaySettings, a, b) {
    const displayNameA = displayUserName(a, locale, teammateNameDisplaySettings);
    const displayNameB = displayUserName(b, locale, teammateNameDisplaySettings);

    return displayNameA.toLowerCase().localeCompare(displayNameB.toLowerCase(), locale, {numeric: true});
}
