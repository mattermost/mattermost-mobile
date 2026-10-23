// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database, type Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import {handlePlaybookRuns} from '@playbooks/actions/local/run';
import {captureRunActivityState, observeTaskActivityRevision, serializeRunActivity} from '@playbooks/actions/local/task_activity';
import {ensurePlaybookRunActivityFresh} from '@playbooks/actions/remote/runs';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {isConsumedTimelineEvent, prepareTimelineEvents} from '@playbooks/database/operators/handlers/timeline_event';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import {compareTaskActivityRevisions, isValidCertifiedTaskLink, parseTaskActivitySync} from '@playbooks/utils/task_activity_sync';
import EphemeralStore from '@store/ephemeral_store';
import {safeParseJSON} from '@utils/helpers';

import type PlaybookTimelineEventModel from '@playbooks/database/models/playbook_timeline_event';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

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

    const result = await handlePlaybookRuns(serverUrl, [playbookRun], false, true);
    if (result?.error) {
        await ensurePlaybookRunActivityFresh(serverUrl, playbookRun.id);
    }
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

    const result = await handlePlaybookRuns(serverUrl, [playbookRun], false, true);
    if (result?.error) {
        await ensurePlaybookRunActivityFresh(serverUrl, playbookRun.id);
    }
};

export const handlePlaybookRunUpdatedIncremental = async (serverUrl: string, msg: WebSocketMessage) => {
    if (!msg.data.payload) {
        return;
    }
    const data = safeParseJSON(msg.data.payload) as PlaybookRunUpdate;
    if (!data || !data.id || !data.changed_fields || typeof data.changed_fields !== 'object') {
        return;
    }

    await applyPlaybookRunDelta(serverUrl, data);
};

export const applyPlaybookRunDelta = async (serverUrl: string, data: PlaybookRunUpdate, allowUnsynced = false) => {
    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const needsRecovery = await serializeRunActivity(database, data.id, () => applyRunUpdatedIncremental(serverUrl, data, allowUnsynced));
    if (needsRecovery) {
        await ensurePlaybookRunActivityFresh(serverUrl, data.id);
    }
};

const applyRunUpdatedIncremental = async (serverUrl: string, data: PlaybookRunUpdate, allowUnsynced: boolean) => {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const run = await getPlaybookRunById(database, data.id);
    if (!run) {
        // Do not handle any data if the run is not in the database
        return allowUnsynced;
    }

    const isSynced = EphemeralStore.getChannelPlaybooksSynced(serverUrl, run.channelId);
    if (!isSynced && !allowUnsynced) {
        // We don't update the run because any information we currently have may be outdated
        return false;
    }

    const sync = parseTaskActivitySync(data.task_activity_sync, false);
    if (data.task_activity_sync && !sync) {
        return true;
    }
    if (sync) {
        observeTaskActivityRevision(database, data.id, sync.epoch, sync.revision);
        if (!run.taskActivityEpoch || !run.taskActivityRevision || run.taskActivityEpoch !== sync.epoch) {
            return true;
        }
        if (compareTaskActivityRevisions(sync.revision, run.taskActivityRevision) <= 0) {
            return false;
        }
        if (sync.base_revision !== run.taskActivityRevision) {
            return true;
        }
        if ('timeline_events' in data.changed_fields && !Array.isArray(data.changed_fields.timeline_events)) {
            return true;
        }
        if (data.changed_fields.checklists?.some((checklist) =>
            checklist.item_inserts?.some((item) => !('state_event_id' in item)) ||
            checklist.item_updates?.some((item) => ('state' in item.fields || 'state_modified' in item.fields) && !('state_event_id' in item.fields)))) {
            return true;
        }
    } else if (run.taskActivityEpoch && ('timeline_events' in data.changed_fields || data.changed_fields.checklists || data.timeline_event_deletes?.length || data.checklist_deletes?.length)) {
        return true;
    }

    const checklistUpdates = data.changed_fields.checklists ?? [];
    if (data.checklist_deletes?.some((id) => checklistUpdates.some((checklist) => checklist.id === id))) {
        return true;
    }
    if (sync && !await hasValidDeltaLinks(database, data)) {
        return true;
    }
    const touched = {
        checklistIds: checklistUpdates.map((checklist) => checklist.id),
        itemIds: checklistUpdates.flatMap((checklist) => [
            ...(checklist.item_inserts?.map((item) => item.id) ?? []),
            ...(checklist.item_updates?.map((item) => item.id) ?? []),
            ...(checklist.item_deletes ?? []),
        ]),
        eventIds: [
            ...(Array.isArray(data.changed_fields.timeline_events) ? data.changed_fields.timeline_events.map((event) => event.id) : []),
            ...(data.timeline_event_deletes ?? []),
        ].filter((id): id is string => typeof id === 'string' && id.length > 0),
    };
    const restore = await captureRunActivityState(database, data.id, data.checklist_deletes?.length ? undefined : touched);
    try {
        const models: Model[] = [];

        // Hard deletes travel outside changed_fields, so they can be the only thing a payload carries.
        const touchesTimeline = 'timeline_events' in data.changed_fields || Boolean(data.timeline_event_deletes?.length);

        const hasRunChangedFields = Object.keys(data.changed_fields).filter((key) => key !== 'checklists' && key !== 'timeline_events').length > 0;
        if (hasRunChangedFields || touchesTimeline || sync) {
            const runModels = await operator.handlePlaybookRun({
                runs: [{
                    ...data.changed_fields,
                    ...(sync ? {task_activity_sync: sync} : {}),
                    checklists: undefined, // Remove the checklists from the update
                    id: data.id,
                    update_at: data.playbook_run_updated_at,
                }],
                prepareRecordsOnly: true,
                processChildren: false,
            });

            models.push(...runModels);
        }

        if (touchesTimeline) {
            const incoming = Array.isArray(data.changed_fields.timeline_events) ? data.changed_fields.timeline_events : [];
            if (sync && incoming.some((event) => !event || typeof event !== 'object' ||
                (!event.delete_at && (!event.event_type || (event.event_type === 'task_state_modified' && !isConsumedTimelineEvent(event)))) ||
                (event.delete_at && (typeof event.id !== 'string' || !event.id)))) {
                restore();
                return true;
            }
            const deletedIds = [...(data.timeline_event_deletes ?? [])];
            for (const event of incoming) {
                if (event?.delete_at && typeof event.id === 'string') {
                    deletedIds.push(event.id);
                }
            }
            const consumed = incoming.filter((event) => !event?.delete_at && isConsumedTimelineEvent(event));
            models.push(...await prepareTimelineEvents(database, data.id, consumed, deletedIds, false));
        }

        if (data.changed_fields.checklists) {
            const promises = [];
            for (const checklist of data.changed_fields.checklists) {
                promises.push(handlePlaybookChecklistUpdated(serverUrl, checklist, data.id));
            }
            const checklistModels = await Promise.all(promises);
            models.push(...checklistModels.flat());
        }

        if (data.checklist_deletes?.length) {
            const deleted = await database.get<PlaybookChecklistModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST).query(
                Q.where('id', Q.oneOf(data.checklist_deletes)),
            ).fetch();
            if (deleted.some((checklist) => checklist.runId !== data.id)) {
                restore();
                return true;
            }
            const deletedModels = await Promise.all(deleted.map((checklist) => checklist.prepareDestroyWithRelations()));
            models.push(...deletedModels.flat());
        }

        if (models.length > 0) {
            await operator.batchRecords(models, 'handlePlaybookRunUpdatedIncremental');
        }
        return false;
    } catch {
        restore();
        return true;
    }
};

const hasValidDeltaLinks = async (database: Database, data: PlaybookRunUpdate) => {
    const changedItems = (data.changed_fields.checklists ?? []).flatMap((checklist) => [
        ...(checklist.item_inserts ?? []).map((item) => ({id: item.id, fields: item})),
        ...(checklist.item_updates ?? []).map((item) => ({id: item.id, fields: item.fields})),
    ]).filter(({fields}) => 'state_event_id' in fields);
    const incoming = Array.isArray(data.changed_fields.timeline_events) ? data.changed_fields.timeline_events : [];
    const events = new Map(incoming.filter((event) => event && !event.delete_at).map((event) => [event.id, event]));
    const deleted = new Set([
        ...(data.timeline_event_deletes ?? []),
        ...incoming.filter((event) => event?.delete_at).map((event) => event.id),
    ]);
    if (deleted.size) {
        const linkedItems = await database.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).query(
            Q.where('state_event_id', Q.oneOf([...deleted])),
        ).fetch();
        const removedItems = new Set((data.changed_fields.checklists ?? []).flatMap((checklist) => checklist.item_deletes ?? []));
        const removedChecklists = new Set(data.checklist_deletes ?? []);
        if (linkedItems.some((item) => !removedItems.has(item.id) && !removedChecklists.has(item.checklistId) &&
            !changedItems.some((change) => change.id === item.id && 'state_event_id' in change.fields &&
                change.fields.state_event_id !== item.stateEventId))) {
            return false;
        }
    }
    if (!changedItems.length) {
        return true;
    }
    const existingItems = await database.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).query(
        Q.where('id', Q.oneOf(changedItems.map(({id}) => id))),
    ).fetch();
    const items = new Map(existingItems.map((item) => [item.id, item]));
    const linkedIds = changedItems.map(({fields}) => fields.state_event_id).filter((id): id is string => typeof id === 'string' && !events.has(id) && !deleted.has(id));
    if (linkedIds.length) {
        const storedEvents = await database.get<PlaybookTimelineEventModel>(PLAYBOOK_TABLES.PLAYBOOK_TIMELINE_EVENT).query(
            Q.where('id', Q.oneOf(linkedIds)),
        ).fetch();
        for (const event of storedEvents) {
            events.set(event.id, event.toTimelineEvent());
        }
    }
    return changedItems.every(({id, fields}) => {
        const previous = items.get(id);
        const item = {
            id,
            state: fields.state ?? previous?.state,
            state_modified: fields.state_modified ?? previous?.stateModified,
            state_event_id: fields.state_event_id,
        } as PlaybookChecklistItem;
        return item.state_event_id === null || (typeof item.state_event_id === 'string' && item.state_event_id.length > 0 && !deleted.has(item.state_event_id) &&
            isValidCertifiedTaskLink(item, events.get(item.state_event_id), data.id));
    });
};

const handlePlaybookChecklistUpdated = async (serverUrl: string, checklistUpdate: PlaybookChecklistUpdate, runId: string) => {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const existingChecklist = await database.get<PlaybookChecklistModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST).query(Q.where('id', checklistUpdate.id)).fetch();
    if (existingChecklist.some((checklist) => checklist.runId !== runId)) {
        throw new Error('Checklist belongs to another run');
    }
    const addressedItemIds = [
        ...(checklistUpdate.item_inserts?.map((item) => item.id) ?? []),
        ...(checklistUpdate.item_updates?.map((item) => item.id) ?? []),
        ...(checklistUpdate.item_deletes ?? []),
    ];
    if (addressedItemIds.length) {
        const existingItems = await database.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).query(Q.where('id', Q.oneOf(addressedItemIds))).fetch();
        if (existingItems.some((item) => item.checklistId !== checklistUpdate.id)) {
            throw new Error('Task belongs to another checklist');
        }
    }

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

    const deletedItems = new Set(checklistUpdate.item_deletes ?? []);
    if (checklistUpdate.item_inserts) {
        const promises = [];
        for (const item of checklistUpdate.item_inserts.filter((value) => !deletedItems.has(value.id))) {
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
        for (const item of checklistUpdate.item_updates.filter((value) => !deletedItems.has(value.id))) {
            promises.push(handlePlaybookChecklistItemUpdated(serverUrl, item, checklistUpdate.id));
        }
        const checklistItemModels = await Promise.all(promises);
        models.push(...checklistItemModels.flat());
    }

    if (deletedItems.size) {
        const existing = await database.get(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).query(
            Q.where('checklist_id', checklistUpdate.id),
            Q.where('id', Q.oneOf([...deletedItems])),
        ).fetch();
        models.push(...existing.map((item) => item.prepareDestroyPermanently()));
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
