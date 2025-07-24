// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import EphemeralStore from '@store/ephemeral_store';
import {safeParseJSON} from '@utils/helpers';

import type {Model} from '@nozbe/watermelondb';

const isValidEvent = (data: unknown) => {
    if (!data || typeof data !== 'object') {
        return false;
    }
    return true;
};

export const handlePlaybookRunCreated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload) as PlaybookRunCreatedPayload;
    if (!isValidEvent(data)) {
        return;
    }

    const playbookRun = data.playbook_run;

    const isSynced = EphemeralStore.getChannelPlaybooksSynced(serverUrl, playbookRun.channel_id);
    if (!isSynced) {
        // We don't update the run because any information we currently have may be outdated
        return;
    }

    await handlePlaybookRuns(serverUrl, [playbookRun], false, true);
};

export const handlePlaybookRunUpdated = async (serverUrl: string, msg: WebSocketMessage) => {
    // Same as handlePlaybookRunCreated, but only used for non-incremental updates
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload) as PlaybookRun;
    if (!isValidEvent(data)) {
        return;
    }

    const playbookRun = data;

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
    if (!data || !data.changed_fields || typeof data.changed_fields !== 'object') {
        return;
    }

    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const run = await getPlaybookRunById(database, data.id);
    if (!run) {
        // Do not handle any data if the run is not in the database
        return;
    }

    const isSynced = EphemeralStore.getChannelPlaybooksSynced(serverUrl, run.channelId);
    if (!isSynced) {
        // We don't update the run because any information we currently have may be outdated
        return;
    }

    const models: Model[] = [];

    const hasRunChangedFields = Object.keys(data.changed_fields).filter((key) => key !== 'checklists').length > 0;
    if (hasRunChangedFields) {
        const runModels = await operator.handlePlaybookRun({
            runs: [{
                ...data.changed_fields,
                checklists: undefined, // Remove the checklists from the update
                id: data.id,
                update_at: data.playbook_run_updated_at,
            }],
            prepareRecordsOnly: true,
            processChildren: false,
        });

        models.push(...runModels);
    }

    if (data.changed_fields.checklists) {
        const promises = [];
        for (const checklist of data.changed_fields.checklists) {
            promises.push(handlePlaybookChecklistUpdated(serverUrl, checklist, data.id));
        }
        const checklistModels = await Promise.all(promises);
        models.push(...checklistModels.flat());
    }

    if (models.length > 0) {
        await operator.batchRecords(models, 'handlePlaybookRunUpdatedIncremental');
    }
};

const handlePlaybookChecklistUpdated = async (serverUrl: string, checklistUpdate: PlaybookChecklistUpdate, runId: string) => {
    const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const models: Model[] = [];
    const hasChecklistChangedFields = Object.keys(checklistUpdate.fields || {}).length > 0;
    if (hasChecklistChangedFields) {
        const checklistModels = await operator.handlePlaybookChecklist({
            checklists: [{
                ...(checklistUpdate.fields || {}),
                items_order: checklistUpdate.items_order,
                items: undefined, // Remove the items from the update
                id: checklistUpdate.id,
                update_at: checklistUpdate.checklist_updated_at,
                run_id: runId,
            }],
            prepareRecordsOnly: true,
            processChildren: false,
        });

        models.push(...checklistModels);
    }

    if (checklistUpdate.item_inserts) {
        const promises = [];
        for (const item of checklistUpdate.item_inserts) {
            promises.push(operator.handlePlaybookChecklistItem({
                items: [{...item, checklist_id: checklistUpdate.id, update_at: checklistUpdate.checklist_updated_at}],
                prepareRecordsOnly: true,
            }));
        }
        const checklistItemModels = await Promise.all(promises);
        models.push(...checklistItemModels.flat());
    }

    if (checklistUpdate.item_updates) {
        const promises = [];
        for (const item of checklistUpdate.item_updates) {
            promises.push(handlePlaybookChecklistItemUpdated(serverUrl, item, checklistUpdate.id));
        }
        const checklistItemModels = await Promise.all(promises);
        models.push(...checklistItemModels.flat());
    }

    return models;
};

const handlePlaybookChecklistItemUpdated = async (serverUrl: string, itemUpdate: PlaybookChecklistItemUpdate, checklistId: string) => {
    const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    return operator.handlePlaybookChecklistItem({
        items: [{...itemUpdate.fields, id: itemUpdate.id, checklist_id: checklistId, update_at: itemUpdate.checklist_item_updated_at}],
        prepareRecordsOnly: true,
    });
};
