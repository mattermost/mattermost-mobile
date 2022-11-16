// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logError} from '@app/utils/log';
import {GLOBAL_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

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

export const storeOnboardingViewedValue = async (value = true) => {
    try {
        const {operator} = DatabaseManager.getAppDatabaseAndOperator();
        return operator.handleGlobal({
            globals: [{id: GLOBAL_IDENTIFIERS.ONBOARDING, value}],
            prepareRecordsOnly: false,
        });
    } catch (error) {
        logError('storeOnboardingViewedValue', error);
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
