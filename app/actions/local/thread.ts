// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

export const processThreadsFetched = async (serverUrl: string, threads: Thread[]) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (operator) {
        console.log('processThreadsFetched');
        await operator.handleThreads({
            threads,
        });
    }
};
