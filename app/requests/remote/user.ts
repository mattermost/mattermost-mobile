// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {Q} from '@nozbe/watermelondb';
import {Client4Error} from '@typings/api/client4';

const HTTP_UNAUTHORIZED = 401;

//fixme: this file needs to be finalized

export const logout = (skipServerLogout = false) => {
    return async () => {
        if (!skipServerLogout) {
            try {
                Client4.logout();
            } catch {
                // Do nothing
            }
        }

        //fixme: uncomment below EventEmitter.emit
        // EventEmitter.emit(NavigationTypes.NAVIGATION_RESET);

        return {data: true}; //fixme: why ??
    };
};

export const forceLogoutIfNecessary = async (err: Client4Error) => {
    const database = DatabaseManager.getActiveServerDatabase();

    if (!database) {
        return;
    }

    const currentUserId = await database.collections.get(MM_TABLES.SERVER.SYSTEM).query(Q.where('name', 'currentUserId')).fetch();

    if ('status_code' in err && err.status_code === HTTP_UNAUTHORIZED && err?.url?.indexOf('/login') === -1 && currentUserId) {
        logout(false);
    }
};
