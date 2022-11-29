// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GLOBAL_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {logError} from '@utils/log';

export const storeGlobal = async (id: string, value: unknown, prepareRecordsOnly = false) => {
    try {
        const {operator} = DatabaseManager.getAppDatabaseAndOperator();
        return operator.handleGlobal({
            globals: [{id, value}],
            prepareRecordsOnly,
        });
    } catch (error) {
        logError('storeGlobal', error);
        return {error};
    }
};

export const storeDeviceToken = async (token: string, prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.DEVICE_TOKEN, token, prepareRecordsOnly);
};

export const storeMultiServerTutorial = async (prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.MULTI_SERVER_TUTORIAL, 'true', prepareRecordsOnly);
};

export const storeOnboardingViewedValue = async (value = true) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.ONBOARDING, value, false);
};

export const storeProfileLongPressTutorial = async (prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.PROFILE_LONG_PRESS_TUTORIAL, 'true', prepareRecordsOnly);
};

export const storeDontAskForReview = async (prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.DONT_ASK_FOR_REVIEW, 'true', prepareRecordsOnly);
};

export const storeLastAskForReview = async (prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.LAST_ASK_FOR_REVIEW, Date.now(), prepareRecordsOnly);
};

export const storeFirstLaunch = async (prepareRecordsOnly = false) => {
    return storeGlobal(GLOBAL_IDENTIFIERS.FIRST_LAUNCH, Date.now(), prepareRecordsOnly);
};
