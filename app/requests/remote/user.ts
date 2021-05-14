// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import {MM_TABLES} from '@constants/database';
import DatabaseConnectionException from '@database/exceptions/database_connection_exception';
import DatabaseManager from '@database/manager';
import {Q} from '@nozbe/watermelondb';
import {Client4Error} from '@typings/api/client4';
import Global from '@typings/database/global';
import {getCSRFFromCookie} from '@utils/security';

const HTTP_UNAUTHORIZED = 401;

//fixme: this file needs to be finalized
//todo: retrieve deviceToken from default database - Global entity

export const logout = async (skipServerLogout = false) => {
    return async () => {
        if (!skipServerLogout) {
            try {
                await Client4.logout();
            } catch {
                // Do nothing
            }
        }

        //fixme: uncomment below EventEmitter.emit
        // EventEmitter.emit(NavigationTypes.NAVIGATION_RESET);

        return {data: true};
    };
};

export const forceLogoutIfNecessary = async (err: Client4Error) => {
    const database = DatabaseManager.getActiveServerDatabase();

    if (!database) {
        throw new DatabaseConnectionException('DatabaseManager.getActiveServerDatabase returned undefined');
    }

    const currentUserId = await database.collections.get(MM_TABLES.SERVER.SYSTEM).query(Q.where('name', 'currentUserId')).fetch();

    if ('status_code' in err && err.status_code === HTTP_UNAUTHORIZED && err?.url?.indexOf('/login') === -1 && currentUserId) {
        logout(false);
    }
};

type LoginArgs = { loginId: string, password: string, mfaToken?: string, ldapOnly?: boolean }
export const login = async ({loginId, password, mfaToken, ldapOnly = false}: LoginArgs) => {
    const database = await DatabaseManager.getDefaultDatabase();

    if (!database) {
        throw new DatabaseConnectionException('DatabaseManager.getActiveServerDatabase returned undefined');
    }

    let deviceToken;
    let user;

    try {
        const tokens = await database.collections.get(MM_TABLES.DEFAULT.GLOBAL).query(Q.where('name', 'deviceToken')).fetch() as Global[];
        deviceToken = tokens?.[0]?.value ?? '';

        user = await Client4.login(loginId, password, mfaToken, deviceToken, ldapOnly);

        //todo: login successful => create server database and set this serverURL to be the current active database
        await getCSRFFromCookie(Client4.getUrl());
    } catch (error) {
        return {error};
    }

    //todo : loadMe
    // const result = await dispatch(loadMe(user));

    // if (!result.error) {
    //     //todo: completeLogin
    //     // dispatch(completeLogin(user, deviceToken));
    // }
    // return user;
    //     return result;

    return user;
};

// export function completeLogin(user, deviceToken) {
//     const state = getState();
//     const config = getConfig(state);
//     const license = getLicense(state);
//     const token = Client4.getToken();
//     const url = Client4.getUrl();
//
//     setAppCredentials(deviceToken, user.id, token, url);
//
//     // Set timezone
//     const enableTimezone = isTimezoneEnabled(state);
//     if (enableTimezone) {
//         const timezone = getDeviceTimezone();
//         dispatch(autoUpdateTimezone(timezone));
//     }
//
//     // Data retention
//     if (config?.DataRetentionEnableMessageDeletion && config?.DataRetentionEnableMessageDeletion === 'true' &&
//             license?.IsLicensed === 'true' && license?.DataRetention === 'true') {
//         dispatch(getDataRetentionPolicy());
//     } else {
//         dispatch({type: GeneralTypes.RECEIVED_DATA_RETENTION_POLICY, data: {}});
//     }
// }
