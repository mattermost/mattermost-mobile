// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
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

export async function setOwner(serverUrl: string, playbookRunId: string, ownerId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const run = await getPlaybookRunById(database, playbookRunId);
        if (!run) {
            return {error: 'Run not found'};
        }

        await database.write(async () => {
            run.update((r) => {
                r.ownerUserId = ownerId;
            });
        });

        return {data: true};
    } catch (error) {
        logError('failed to set owner', error);
        return {error};
    }
}
