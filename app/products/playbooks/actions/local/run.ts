// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {logError} from '@utils/log';

export async function handlePlaybookRuns(serverUrl: string, runs: PlaybookRun[], prepareRecordsOnly = false, processChildren = false) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const data = await operator.handlePlaybookRun({
            runs,
            prepareRecordsOnly,
            processChildren,
        });
        return {data};
    } catch (error) {
        logError('failed to handle playbook runs', error);
        return {error};
    }
}
