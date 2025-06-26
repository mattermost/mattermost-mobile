// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import EphemeralStore from '@store/ephemeral_store';
import {safeParseJSON} from '@utils/helpers';

export const handlePlaybookRunCreated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload);
    if (!data) {
        return;
    }

    const playbookRun = data as PlaybookRun;

    const isSynced = EphemeralStore.getChannelPlaybooksSynced(serverUrl, playbookRun.channel_id);
    if (!isSynced) {
        // We don't update the run because any information we currently have may be outdated
        return;
    }

    await handlePlaybookRuns(serverUrl, [playbookRun], false, true);
};

export const handlePlaybookRunUpdated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload);
    if (!data) {
        return;
    }

    const playbookRun = data as PlaybookRun;

    const isSynced = EphemeralStore.getChannelPlaybooksSynced(serverUrl, playbookRun.channel_id);
    if (!isSynced) {
        // We don't update the run because any information we currently have may be outdated
        return;
    }

    await handlePlaybookRuns(serverUrl, [playbookRun], false, true);
};

export const handlePlaybookRunUpdatedIncremental = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload) as PlaybookRunUpdate;
    if (!data?.changed_fields) {
        return;
    }

    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const run = await getPlaybookRunById(database, data.id);
    if (!run) {
        // Do not handle any data if the run is not in the database
        return;
    }

    await operator.handlePlaybookRun({
        runs: [{
            ...data.changed_fields,
            id: data.id,
            update_at: data.updated_at,
        }],
        prepareRecordsOnly: false,
        processChildren: false,
    });
};

export const handlePlaybookChecklistUpdated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload) as PlaybookChecklistUpdate;
    if (!data?.update?.fields) {
        return;
    }

    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const run = await getPlaybookRunById(database, data.playbook_run_id);
    if (!run) {
        // Do not handle any data if the run is not in the database
        return;
    }

    await operator.handlePlaybookChecklist({
        checklists: [{
            ...data.update.fields,
            id: data.update.id,
            update_at: data.update.updated_at,
            run_id: data.playbook_run_id,
        }],
        prepareRecordsOnly: false,
        processChildren: false,
    });

    if (data.update.item_inserts) {
        for (const item of data.update.item_inserts) {
            operator.handlePlaybookChecklistItem({
                items: [{...item, checklist_id: data.update.id, update_at: data.update.updated_at}],
                prepareRecordsOnly: false,
            });
        }
    }
};

export const handlePlaybookChecklistItemUpdated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload) as PlaybookChecklistItemUpdate;
    if (!data) {
        return;
    }

    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const run = await getPlaybookRunById(database, data.playbook_run_id);
    if (!run) {
        // Do not handle any data if the run is not in the database
        return;
    }

    await operator.handlePlaybookChecklistItem({
        items: [{...data.update.fields, id: data.update.id, checklist_id: data.checklist_id, update_at: data.update.updated_at}],
        prepareRecordsOnly: false,
    });
};
