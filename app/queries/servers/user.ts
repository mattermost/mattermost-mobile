// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';

import {observePreferencesByCategoryAndName} from './preference';
import {observeConfig, observeCurrentUserId, observeLicense, queryCurrentUserId} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type UserModel from '@typings/database/models/servers/user';

export const queryUserById = async (database: Database, userId: string) => {
    try {
        const userRecord = (await database.collections.get(MM_TABLES.SERVER.USER).find(userId)) as UserModel;
        return userRecord;
    } catch {
        return undefined;
    }
};

export const queryCurrentUser = async (database: Database) => {
    const currentUserId = await queryCurrentUserId(database);
    if (currentUserId) {
        return queryUserById(database, currentUserId);
    }

    return undefined;
};

export const observeCurrentUser = (database: Database) => {
    return observeCurrentUserId(database).pipe(
        switchMap((id) => database.get<UserModel>(MM_TABLES.SERVER.USER).findAndObserve(id)),
    );
};

export const queryAllUsers = async (database: Database): Promise<UserModel[]> => {
    try {
        const userRecords = (await database.get(MM_TABLES.SERVER.USER).query().fetch()) as UserModel[];
        return userRecords;
    } catch {
        return Promise.resolve([] as UserModel[]);
    }
};

export const queryUsersById = async (database: Database, userIds: string[]): Promise<UserModel[]> => {
    try {
        const userRecords = (await database.get(MM_TABLES.SERVER.USER).query(Q.where('id', Q.oneOf(userIds))).fetch()) as UserModel[];
        return userRecords;
    } catch {
        return Promise.resolve([] as UserModel[]);
    }
};

export const queryUsersByUsername = async (database: Database, usernames: string[]): Promise<UserModel[]> => {
    try {
        const userRecords = (await database.get(MM_TABLES.SERVER.USER).query(Q.where('username', Q.oneOf(usernames))).fetch()) as UserModel[];
        return userRecords;
    } catch {
        return Promise.resolve([] as UserModel[]);
    }
};

export const prepareUsers = (operator: ServerDataOperator, users: UserProfile[]) => {
    try {
        if (users.length) {
            return operator.handleUsers({users, prepareRecordsOnly: true});
        }

        return undefined;
    } catch {
        return undefined;
    }
};

export const observeTeammateNameDisplay = (database: Database) => {
    const config = observeConfig(database);
    const license = observeLicense(database);
    const preferences = observePreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS);
    return combineLatest([config, license, preferences]).pipe(
        switchMap(
            ([cfg, lcs, prefs]) => getTeammateNameDisplaySetting(prefs, cfg, lcs),
        ),
    );
};
