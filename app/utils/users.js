// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Preferences} from 'app/constants';
import {getLocalizedMessage} from 'app/i18n';

export function isInRole(roles, inRole) {
    if (roles) {
        var parts = roles.split(' ');
        for (var i = 0; i < parts.length; i++) {
            if (parts[i] === inRole) {
                return true;
            }
        }
    }

    return false;
}

export function isGuest(user) {
    if (user && user.roles && isInRole(user.roles, 'system_guest')) {
        return true;
    }
    return false;
}

export function displayUserName(user, teammateNameDisplaySetting, useFallbackUsername = true) {
    let name = useFallbackUsername ? getLocalizedMessage(user?.locale || General.DEFAULT_LOCALE, 'channel_loader.someone') : '';

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
