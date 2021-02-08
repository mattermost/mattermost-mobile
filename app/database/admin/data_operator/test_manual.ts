// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DataOperator, {OperationType} from './index';

export const runAppTests = async () => {
    const runAppCreateSimple = async () => {
        await DataOperator.handleAppEntity({
            optType: OperationType.CREATE,
            values: {buildNumber: 'build-7', createdAt: 1, id: 'id-7', versionNumber: 'version-7'},
        });
    };

    // const runAppCreateArray = () => {};
    // const runAppUpdate = () => {};

    await runAppCreateSimple();

    // runAppUpdate();
};
