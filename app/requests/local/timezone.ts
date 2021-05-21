// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {updateMe} from '@requests/remote/user';
import {getTimeZone} from 'react-native-localize';

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import DatabaseConnectionException from '@database/exceptions/database_connection_exception';
import DatabaseManager from '@database/manager';
import System from '@typings/database/system';
import {Config} from '@typings/database/config';
import User from '@typings/database/user';

export const isTimezoneEnabled = (config: Partial<Config>) => {
    return config?.ExperimentalTimezone === 'true';
};

export function getDeviceTimezone() {
    return getTimeZone();
}

export const autoUpdateTimezone = async (deviceTimezone: string) => {
    const database = await DatabaseManager.getActiveServerDatabase();
    if (!database) {
        throw new DatabaseConnectionException(
            'DatabaseManager.getActiveServerDatabase returned undefined in @requests/local/timezone/autoUpdateTimezone',
        );
    }

    let currentUser: User;
    try {
        const systemRecords = (await database.collections.
            get(MM_TABLES.SERVER.SYSTEM).
            query(Q.where('name', 'currentUser')).
            fetch()) as System[];
        currentUser = systemRecords?.[0]?.value;
    } catch (e) {
        throw new DataOperatorException(
            'key currentUser has not been set in System entity in @requests/local/timezone/autoUpdateTimezone',
        );
    }
    if (!currentUser) {
        return;
    }

    const currentTimezone = getUserTimezone(currentUser);
    const newTimezoneExists = currentTimezone.automaticTimezone !== deviceTimezone;

    if (currentTimezone.useAutomaticTimezone && newTimezoneExists) {
        const timezone = {
            useAutomaticTimezone: 'true',
            automaticTimezone: deviceTimezone,
            manualTimezone: currentTimezone.manualTimezone,
        };

        const updatedUser = {...currentUser, timezone} as unknown as User;
        await updateMe(updatedUser);
    }
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
