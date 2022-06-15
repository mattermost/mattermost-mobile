// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {GLOBAL_IDENTIFIERS, MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import type GlobalModel from '@typings/database/models/app/global';

const {APP: {GLOBAL}} = MM_TABLES;

export const getDeviceToken = async (appDatabase: Database): Promise<string> => {
    try {
        const tokens = await appDatabase.get<GlobalModel>(GLOBAL).find(GLOBAL_IDENTIFIERS.DEVICE_TOKEN);
        return tokens?.value || '';
    } catch {
        return '';
    }
};

export const observeMultiServerTutorial = (appDatabase: Database) => {
    return appDatabase.get<GlobalModel>(GLOBAL).query(Q.where('id', GLOBAL_IDENTIFIERS.MULTI_SERVER_TUTORIAL), Q.take(1)).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(false))),
        switchMap((v) => of$(Boolean(v))),
    );
};

export const observeProfileLongPresTutorial = () => {
    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return of$(false);
    }
    return appDatabase.get<GlobalModel>(GLOBAL).query(Q.where('id', GLOBAL_IDENTIFIERS.PROFILE_LONG_PRESS_TUTORIAL), Q.take(1)).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(false))),
        switchMap((v) => of$(Boolean(v))),
    );
};
