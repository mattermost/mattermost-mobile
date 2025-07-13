// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import EphemeralStore from '@store/ephemeral_store';
import {safeParseJSON} from '@utils/helpers';

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
    if (!data?.changed_fields) {
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

    await operator.handlePlaybookRun({
        runs: [{
            ...data.changed_fields,
            checklists: undefined, // Remove the checklists from the update
            id: data.id,
            update_at: data.playbook_run_updated_at,
        }],
        prepareRecordsOnly: false,
        processChildren: false,
    });
};

export const handlePlaybookChecklistUpdated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload) as PlaybookChecklistUpdatePayload;
    if (!data?.update?.fields && !data?.update?.items_order) {
        return;
    }

    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const run = await getPlaybookRunById(database, data.playbook_run_id);
    if (!run) {
        // Do not handle any data if the run is not in the database
        return;
    }

    const isSynced = EphemeralStore.getChannelPlaybooksSynced(serverUrl, run.channelId);
    if (!isSynced) {
        // We don't update the run because any information we currently have may be outdated
        return;
    }

    await operator.handlePlaybookChecklist({
        checklists: [{
            ...(data.update?.fields || {}),
            items_order: data.update?.items_order,
            items: undefined, // Remove the items from the update
            id: data.update.id,
            update_at: data.update.checklist_updated_at,
            run_id: data.playbook_run_id,
        }],
        prepareRecordsOnly: false,
        processChildren: false,
    });

    if (data.update.item_inserts) {
        const promises = [];
        for (const item of data.update.item_inserts) {
            promises.push(operator.handlePlaybookChecklistItem({
                items: [{...item, checklist_id: data.update.id, update_at: data.update.checklist_updated_at}],
                prepareRecordsOnly: false,
            }));
        }
        await Promise.all(promises);
    }
};

export const handlePlaybookChecklistItemUpdated = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload) as PlaybookChecklistItemUpdatePayload;
    if (!isValidEvent(data)) {
        return;
    }

    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const run = await getPlaybookRunById(database, data.playbook_run_id);
    if (!run) {
        // Do not handle any data if the run is not in the database
        return;
    }

    const isSynced = EphemeralStore.getChannelPlaybooksSynced(serverUrl, run.channelId);
    if (!isSynced) {
        // We don't update the run because any information we currently have may be outdated
        return;
    }

    await operator.handlePlaybookChecklistItem({
        items: [{...data.update.fields, id: data.update.id, checklist_id: data.checklist_id, update_at: data.update.checklist_item_updated_at}],
        prepareRecordsOnly: false,
    });
};
