// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {queryDraft} from '@app/queries/servers/drafts';
import DatabaseManager from '@database/manager';

export const updateDraftFile = async (serverUrl: string, channelId: string, rootId: string, file: FileInfo, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const draft = await queryDraft(operator.database, channelId, rootId);
    if (!draft) {
        return {error: 'no draft'};
    }

    const i = draft.files.findIndex((v) => v.clientId === file.clientId);
    if (i === -1) {
        return {error: 'file not found'};
    }

    draft.prepareUpdate((d) => {
        d.files[i] = file;
    });

    try {
        if (!prepareRecordsOnly) {
            await operator.batchRecords([draft]);
        }

        return {draft};
    } catch (error) {
        return {error};
    }
};
