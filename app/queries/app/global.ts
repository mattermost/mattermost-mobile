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

export const queryGlobalValue = (key: string) => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        return database.get<GlobalModel>(GLOBAL).query(Q.where('id', key), Q.take(1));
    } catch {
        return undefined;
    }
};

export const observeMultiServerTutorial = () => {
    const query = queryGlobalValue(GLOBAL_IDENTIFIERS.MULTI_SERVER_TUTORIAL);
    if (!query) {
        return of$(false);
    }
    return query.observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(false))),
        switchMap((v) => of$(Boolean(v))),
    );
};

export const observeProfileLongPresTutorial = () => {
    const query = queryGlobalValue(GLOBAL_IDENTIFIERS.PROFILE_LONG_PRESS_TUTORIAL);
    if (!query) {
        return of$(false);
    }
    return query.observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(false))),
        switchMap((v) => of$(Boolean(v))),
    );
};

export const getLastAskedForReview = async () => {
    const records = await queryGlobalValue(GLOBAL_IDENTIFIERS.LAST_ASK_FOR_REVIEW)?.fetch();
    if (!records?.[0]?.value) {
        return 0;
    }

    return records[0].value;
};

export const getDontAskForReview = async () => {
    const records = await queryGlobalValue(GLOBAL_IDENTIFIERS.DONT_ASK_FOR_REVIEW)?.fetch();
    if (!records?.[0]?.value) {
        return false;
    }

    return records[0].value === 'true';
};

export const getFirstLaunch = async () => {
    const records = await queryGlobalValue(GLOBAL_IDENTIFIERS.FIRST_LAUNCH)?.fetch();
    if (!records?.[0]?.value) {
        return 0;
    }

    return records[0].value;
};
