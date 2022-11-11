// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GLOBAL_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

export const storeGlobal = async (value: unknown, id: string, prepareRecordsOnly = false) => {
    try {
        const {operator} = DatabaseManager.getAppDatabaseAndOperator();
        return operator.handleGlobal({
            globals: [{id, value}],
            prepareRecordsOnly,
        });
    } catch (error) {
        return {error};
    }
};

export const storeDeviceToken = async (token: string, prepareRecordsOnly = false) => {
    return storeGlobal(token, GLOBAL_IDENTIFIERS.DEVICE_TOKEN, prepareRecordsOnly);
};

export const storeMultiServerTutorial = async (prepareRecordsOnly = false) => {
    return storeGlobal('true', GLOBAL_IDENTIFIERS.MULTI_SERVER_TUTORIAL, prepareRecordsOnly);
};

export const storeProfileLongPressTutorial = async (prepareRecordsOnly = false) => {
    return storeGlobal('true', GLOBAL_IDENTIFIERS.PROFILE_LONG_PRESS_TUTORIAL, prepareRecordsOnly);
};

export const storeDontAskForReview = async (prepareRecordsOnly = false) => {
    return storeGlobal('true', GLOBAL_IDENTIFIERS.DONT_ASK_FOR_REVIEW, prepareRecordsOnly);
};

export const storeLastAskForReview = async (prepareRecordsOnly = false) => {
    return storeGlobal(Date.now(), GLOBAL_IDENTIFIERS.LAST_ASK_FOR_REVIEW, prepareRecordsOnly);
};

export const storeFirstLaunch = async (prepareRecordsOnly = false) => {
    return storeGlobal(Date.now(), GLOBAL_IDENTIFIERS.FIRST_LAUNCH, prepareRecordsOnly);
};
