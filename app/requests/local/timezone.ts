// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTimeZone} from 'react-native-localize';

import {getUserById} from '@queries/user';
import {updateMe} from '@requests/remote/user';
import {Config} from '@typings/database/config';
import User from '@typings/database/user';
import {getActiveServerDatabase} from '@utils/database';

export const isTimezoneEnabled = (config: Partial<Config>) => {
    return config?.ExperimentalTimezone === 'true';
};

export function getDeviceTimezone() {
    return getTimeZone();
}

export const autoUpdateTimezone = async ({deviceTimezone, userId}: {deviceTimezone: string, userId: string}) => {
    const {activeServerDatabase, error} = await getActiveServerDatabase();
    if (!activeServerDatabase) {
        return {error};
    }

    const currentUser = await getUserById({userId, database: activeServerDatabase}) ?? null;

    if (!currentUser) {
        return null;
    }

    const currentTimezone = getUserTimezone(currentUser);
    const newTimezoneExists = currentTimezone.automaticTimezone !== deviceTimezone;

    if (currentTimezone.useAutomaticTimezone && newTimezoneExists) {
        const timezone = {useAutomaticTimezone: 'true', automaticTimezone: deviceTimezone, manualTimezone: currentTimezone.manualTimezone};
        const updatedUser = {...currentUser, timezone} as User;
        await updateMe(updatedUser);
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
