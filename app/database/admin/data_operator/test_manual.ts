// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DataOperator, {OperationType} from './index';

export const runAppTests = async () => {
    const createRecord = async () => {
        await DataOperator.handleAppData({
            optType: OperationType.CREATE,
            values: {buildNumber: 'build-7', createdAt: 1, id: 'id-7', versionNumber: 'version-7'},
        });
    };

    const createRecords = async () => {
        await DataOperator.handleAppData({
            optType: OperationType.CREATE,
            values: [
                {buildNumber: 'build-8', createdAt: 1, id: 'id-8', versionNumber: 'version-8'},
                {buildNumber: 'build-9', createdAt: 1, id: 'id-9', versionNumber: 'version-9'},
            ],
        });
    };

    // await createRecord();

    await createRecords();

    // runAppUpdate();
};
