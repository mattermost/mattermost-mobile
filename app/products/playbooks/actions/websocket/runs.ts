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

// Unlike every other run field in changed_fields, timeline_events is a delta: the server sends only the
// events it just created or soft-deleted, so assigning it would drop the rest of the run's history.
// Deletions arrive two ways and both have to leave, because a full run fetch selects on DeleteAt = 0 —
// anything kept past that point can never be corrected by a resync. A soft delete comes through as an
// update carrying a non-zero delete_at; timeline events are otherwise immutable.
export const mergeTimelineEvents = (
    stored: TimelineEvent[],
    delta: TimelineEvent[] | undefined,
    hardDeletes: string[] | undefined,
): TimelineEvent[] => {
    const byId = new Map(stored.map((event) => [event.id, event]));

    // Guard the shapes rather than trusting them: these come straight off the wire, and a non-array
    // here would throw inside a fire-and-forget handler where nothing would report it.
    for (const event of Array.isArray(delta) ? delta : []) {
        byId.set(event.id, event);
    }

    for (const id of Array.isArray(hardDeletes) ? hardDeletes : []) {
        byId.delete(id);
    }

    // Matches the server's ORDER BY EventAt ASC, so a merged list and a freshly fetched one agree.
    return Array.from(byId.values()).
        filter((event) => !event.delete_at).
        sort((a, b) => a.event_at - b.event_at);
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

const runUpdateQueues = new Map<string, Promise<void>>();

// Incremental updates are dispatched fire-and-forget — neither app/actions/websocket/event.ts nor
// ./events.ts awaits the handler — so two payloads for the same run can be in flight at once.
// Applying one is a read-merge-write spanning several awaits: the stored timeline events are read when
// handlePlaybookRun is called, but nothing is committed until batchRecords. Overlapping applications
// would therefore both read the pre-commit list, and the later write would drop the earlier one's
// event for good, since a full run fetch is gated on lastFetchAt and never brings it back. Queueing
// per run id keeps one application atomic with respect to the others for that run.
const serializePerRun = <T>(runId: string, apply: () => Promise<T>): Promise<T> => {
    const previous = runUpdateQueues.get(runId) ?? Promise.resolve();

    // Proceed whether or not the previous application settled cleanly: one failed payload must not
    // wedge every later update for this run.
    const applied = previous.then(apply, apply);
    const settled = applied.then(() => undefined, () => undefined);
    runUpdateQueues.set(runId, settled);

    settled.then(() => {
        // Only drop the entry while still the tail, so the map does not retain every run seen.
        if (runUpdateQueues.get(runId) === settled) {
            runUpdateQueues.delete(runId);
        }
    });

    return applied;
};

export const handlePlaybookRunUpdatedIncremental = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload) as PlaybookRunUpdate;
    if (!data || !data.id || !data.changed_fields || typeof data.changed_fields !== 'object') {
        return;
    }

    await serializePerRun(data.id, () => applyRunUpdatedIncremental(serverUrl, data));
};

const applyRunUpdatedIncremental = async (serverUrl: string, data: PlaybookRunUpdate) => {
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

    // Hard deletes travel outside changed_fields, so they can be the only thing a payload carries.
    const touchesTimeline = 'timeline_events' in data.changed_fields || Boolean(data.timeline_event_deletes?.length);

    const hasRunChangedFields = Object.keys(data.changed_fields).filter((key) => key !== 'checklists').length > 0;
    if (hasRunChangedFields || touchesTimeline) {
        const runModels = await operator.handlePlaybookRun({
            runs: [{
                ...data.changed_fields,
                ...(touchesTimeline ? {
                    timeline_events: mergeTimelineEvents(
                        run.timelineEvents,
                        data.changed_fields.timeline_events,
                        data.timeline_event_deletes,
                    ),
                } : {}),
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
    const fields = checklistUpdate.fields || {};
    const hasChecklistChangedFields = Object.keys(fields).length > 0;
    if (hasChecklistChangedFields) {
        const checklistModels = await operator.handlePlaybookChecklist({
            checklists: [{
                ...fields,
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
