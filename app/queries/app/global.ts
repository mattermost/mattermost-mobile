// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {GLOBAL_IDENTIFIERS, MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import type GlobalModel from '@typings/database/models/app/global';

const {APP: {GLOBAL}} = MM_TABLES;

export const getDeviceToken = async (): Promise<string> => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        const tokens = await database.get<GlobalModel>(GLOBAL).find(GLOBAL_IDENTIFIERS.DEVICE_TOKEN);
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

export const getOnboardingViewed = async (): Promise<boolean> => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        const onboardingVal = await database.get<GlobalModel>(GLOBAL).find(GLOBAL_IDENTIFIERS.ONBOARDING);
        return onboardingVal?.value ?? false;
    } catch {
        return false;
    }
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
    return Boolean(records?.[0]?.value);
};

export const getPushDisabledInServerAcknowledged = async (serverDomainString: string) => {
    const records = await queryGlobalValue(`${GLOBAL_IDENTIFIERS.PUSH_DISABLED_ACK}${serverDomainString}`)?.fetch();
    return Boolean(records?.[0]?.value);
};

export const observePushDisabledInServerAcknowledged = (serverDomainString: string) => {
    const query = queryGlobalValue(`${GLOBAL_IDENTIFIERS.PUSH_DISABLED_ACK}${serverDomainString}`);
    if (!query) {
        return of$(false);
    }
    return query.observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(false))),
        switchMap((v) => of$(Boolean(v))),
    );
};

export const getFirstLaunch = async () => {
    const records = await queryGlobalValue(GLOBAL_IDENTIFIERS.FIRST_LAUNCH)?.fetch();
    if (!records?.[0]?.value) {
        return 0;
    }

    return records[0].value;
};

export const getLastViewedChannelIdAndServer = async () => {
    const records = await queryGlobalValue(GLOBAL_IDENTIFIERS.LAST_VIEWED_CHANNEL)?.fetch();
    return records?.[0]?.value;
};

export const getLastViewedThreadIdAndServer = async () => {
    const records = await queryGlobalValue(GLOBAL_IDENTIFIERS.LAST_VIEWED_THREAD)?.fetch();
    return records?.[0]?.value;
};

export const observeTutorialWatched = (tutorial: string) => {
    const query = queryGlobalValue(tutorial);
    if (!query) {
        return of$(false);
    }
    return query.observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(false))),
        switchMap((v) => of$(Boolean(v))),
    );
};
