// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {entry} from '@actions/remote/entry/common';
import {MM_TABLES} from '@app/constants/database';
import {GLOBAL_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

const {
    POST,
    POSTS_IN_CHANNEL,
    POSTS_IN_THREAD,
    THREAD,
    THREADS_IN_TEAM,
    THREAD_PARTICIPANT,
    MY_CHANNEL,
} = MM_TABLES.SERVER;
export const storeDeviceToken = async (token: string, prepareRecordsOnly = false) => {
    try {
        const {operator} = DatabaseManager.getAppDatabaseAndOperator();
        return operator.handleGlobal({
            globals: [{id: GLOBAL_IDENTIFIERS.DEVICE_TOKEN, value: token}],
            prepareRecordsOnly,
        });
    } catch (error) {
        return {error};
    }
};

export const storeMultiServerTutorial = async (prepareRecordsOnly = false) => {
    try {
        const {operator} = DatabaseManager.getAppDatabaseAndOperator();
        return operator.handleGlobal({
            globals: [{id: GLOBAL_IDENTIFIERS.MULTI_SERVER_TUTORIAL, value: 'true'}],
            prepareRecordsOnly,
        });
    } catch (error) {
        return {error};
    }
};

export const storeProfileLongPressTutorial = async (prepareRecordsOnly = false) => {
    try {
        const {operator} = DatabaseManager.getAppDatabaseAndOperator();
        return operator.handleGlobal({
            globals: [{id: GLOBAL_IDENTIFIERS.PROFILE_LONG_PRESS_TUTORIAL, value: 'true'}],
            prepareRecordsOnly,
        });
    } catch (error) {
        return {error};
    }
};

export async function resetAfterCRTChange(serverUrl: string) {
    const database = DatabaseManager.serverDatabases?.[serverUrl].database;

    if (!database) {
        return {error: 'No App database found'};
    }

    try {
        await database.write(() => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return database.adapter.unsafeExecute({
                sqls: [
                    [`DELETE FROM ${POST}`, []],
                    [`DELETE FROM ${POSTS_IN_CHANNEL}`, []],
                    [`DELETE FROM ${POSTS_IN_THREAD}`, []],
                    [`DELETE FROM ${THREAD}`, []],
                    [`DELETE FROM ${THREADS_IN_TEAM}`, []],
                    [`DELETE FROM ${THREAD_PARTICIPANT}`, []],
                    [`DELETE FROM ${MY_CHANNEL}`, []],
                ],
            });
        });
        return await entry(serverUrl);
    } catch (error) {
        if (__DEV__) {
            throw error;
        }
        return {error};
    }
}
