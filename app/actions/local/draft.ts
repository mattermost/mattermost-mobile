// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {queryDraft} from '@queries/servers/drafts';

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

    // We create a new list to make sure we re-render the draft input.
    const newFiles = [...draft.files];
    newFiles[i] = file;
    draft.prepareUpdate((d) => {
        d.files = newFiles;
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

export const removeDraftFile = async (serverUrl: string, channelId: string, rootId: string, clientId: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const draft = await queryDraft(operator.database, channelId, rootId);
    if (!draft) {
        return {error: 'no draft'};
    }

    const i = draft.files.findIndex((v) => v.clientId === clientId);
    if (i === -1) {
        return {error: 'file not found'};
    }

    if (draft.files.length === 1 && !draft.message) {
        draft.prepareDestroyPermanently();
    } else {
        draft.prepareUpdate((d) => {
            d.files = draft.files.filter((v, index) => index !== i);
        });
    }

    try {
        if (!prepareRecordsOnly) {
            await operator.batchRecords([draft]);
        }

        return {draft};
    } catch (error) {
        return {error};
    }
};

export const updateDraftMessage = async (serverUrl: string, channelId: string, rootId: string, message: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const draft = await queryDraft(operator.database, channelId, rootId);
    if (!draft) {
        if (!message) {
            return {};
        }

        const newDraft: Draft = {
            channel_id: channelId,
            root_id: rootId,
            message,
        };

        return operator.handleDraft({drafts: [newDraft], prepareRecordsOnly});
    }

    if (draft.message === message) {
        return {draft};
    }

    if (draft.files.length === 0 && !message) {
        draft.prepareDestroyPermanently();
    } else {
        draft.prepareUpdate((d) => {
            d.message = message;
        });
    }

    try {
        if (!prepareRecordsOnly) {
            await operator.batchRecords([draft]);
        }

        return {draft};
    } catch (error) {
        return {error};
    }
};

export const addFilesToDraft = async (serverUrl: string, channelId: string, rootId: string, files: FileInfo[], prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const draft = await queryDraft(operator.database, channelId, rootId);
    if (!draft) {
        const newDraft: Draft = {
            channel_id: channelId,
            root_id: rootId,
            files,
            message: '',
        };

        return operator.handleDraft({drafts: [newDraft], prepareRecordsOnly});
    }

    draft.prepareUpdate((d) => {
        d.files = [...draft.files, ...files];
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

export const removeDraft = async (serverUrl: string, channelId: string, rootId = '') => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const draft = await queryDraft(database, channelId, rootId);
    if (draft) {
        await database.write(async () => {
            await draft.destroyPermanently();
        });
    }

    return {draft};
};
