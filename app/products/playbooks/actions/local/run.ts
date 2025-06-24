// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

export async function handlePlaybookRuns(serverUrl: string, runs: PlaybookRun[], prepareRecordsOnly = false, processChildren = false) {
    const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    return operator.handlePlaybookRun({
        runs,
        prepareRecordsOnly,
        processChildren,
    });
}
