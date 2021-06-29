// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTimeZone} from 'react-native-localize';

import DatabaseManager from '@database/manager';
import {getUserById} from '@queries/servers/user';
import {updateMe} from '@requests/remote/user';
import {Config} from '@typings/database/models/servers/config';
import User from '@typings/database/models/servers/user';

export const isTimezoneEnabled = (config: Partial<Config>) => {
    return config?.ExperimentalTimezone === 'true';
};

export function getDeviceTimezone() {
    return getTimeZone();
}

export const autoUpdateTimezone = async (serverUrl: string, {deviceTimezone, userId}: {deviceTimezone: string, userId: string}) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    if (!database) {
        return {error: `No database present for ${serverUrl}`};
    }

    const currentUser = await getUserById({userId, database}) ?? null;

    if (!currentUser) {
        return null;
    }

    const currentTimezone = getUserTimezone(currentUser);
    const newTimezoneExists = currentTimezone.automaticTimezone !== deviceTimezone;

    if (currentTimezone.useAutomaticTimezone && newTimezoneExists) {
        const timezone = {useAutomaticTimezone: 'true', automaticTimezone: deviceTimezone, manualTimezone: currentTimezone.manualTimezone};
        const updatedUser = {...currentUser, timezone} as User;
        await updateMe(serverUrl, updatedUser);
    }
    return null;
};

export const getUserTimezone = (currentUser: User) => {
    if (currentUser?.timezone) {
        return {
            ...currentUser?.timezone,
            useAutomaticTimezone: currentUser?.timezone?.useAutomaticTimezone === 'true',
        };
    }

    return {
        useAutomaticTimezone: true,
        automaticTimezone: '',
        manualTimezone: '',
    };
};
