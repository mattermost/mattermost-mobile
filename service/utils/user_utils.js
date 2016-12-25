// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Constants} from 'service/constants';

export function getFullName(user) {
    if (user.first_name && user.last_name) {
        return user.first_name + ' ' + user.last_name;
    } else if (user.first_name) {
        return user.first_name;
    } else if (user.last_name) {
        return user.last_name;
    }

    return '';
}

export function displayUsername(user, myPreferences) {
    let nameFormat = 'false';
    const pref = myPreferences[`${Constants.CATEGORY_DISPLAY_SETTINGS}--name_format`];
    if (pref && pref.value) {
        nameFormat = pref.value;
    }
    let username = '';

    if (user) {
        if (nameFormat === Constants.DISPLAY_PREFER_NICKNAME) {
            username = user.nickname || getFullName(user);
        } else if (nameFormat === Constants.DISPLAY_PREFER_FULL_NAME) {
            username = getFullName(user);
        }

        if (!username.trim().length) {
            username = user.username;
        }
    }
    return username;
}
