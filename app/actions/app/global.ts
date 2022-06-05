// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GLOBAL_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

export const storeDeviceToken = async (token: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.appDatabase?.operator;

    if (!operator) {
        return {error: 'No App database found'};
    }

    return operator.handleGlobal({
        globals: [{id: GLOBAL_IDENTIFIERS.DEVICE_TOKEN, value: token}],
        prepareRecordsOnly,
    });
};

export const storeMultiServerTutorial = async (prepareRecordsOnly = false) => {
    const operator = DatabaseManager.appDatabase?.operator;

    if (!operator) {
        return {error: 'No App database found'};
    }

    return operator.handleGlobal({
        globals: [{id: GLOBAL_IDENTIFIERS.MULTI_SERVER_TUTORIAL, value: 'true'}],
        prepareRecordsOnly,
    });
};

export const storeProfileLongPressTutorial = async (prepareRecordsOnly = false) => {
    const operator = DatabaseManager.appDatabase?.operator;

    if (!operator) {
        return {error: 'No App database found'};
    }

    return operator.handleGlobal({
        globals: [{id: GLOBAL_IDENTIFIERS.PROFILE_LONG_PRESS_TUTORIAL, value: 'true'}],
        prepareRecordsOnly,
    });
};
