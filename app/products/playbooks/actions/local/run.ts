// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import {captureRunActivityState, serializeRunActivity} from '@playbooks/actions/local/task_activity';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {isConsumedTimelineEvent, prepareTimelineEvents} from '@playbooks/database/operators/handlers/timeline_event';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import {compareTaskActivityRevisions, isValidCertifiedTaskLink, parseTaskActivitySync} from '@playbooks/utils/task_activity_sync';
import {logError} from '@utils/log';

const hasMissingStateLinks = (run: PlaybookRun) => run.checklists.some((checklist) =>
    checklist.items.some((item) => !('state_event_id' in item)));

const hasInvalidStateLinks = (run: PlaybookRun, byEventId: Map<string, TimelineEvent>) => run.checklists.some((checklist) =>
    checklist.items.some((item) => !isValidCertifiedTaskLink(item, item.state_event_id ? byEventId.get(item.state_event_id) : undefined, run.id)));

const clearLegacyStateLinks = (checklists: PlaybookChecklist[]) => checklists.map((checklist) => ({
    ...checklist,
    items: checklist.items.map((item) => ({...item, state_event_link_known: false})),
}));

export async function handlePlaybookRuns(serverUrl: string, runs: PlaybookRun[], prepareRecordsOnly = false, processChildren = false, allowEpochChange = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const data: Model[] = [];
        for (const run of runs) {
            // eslint-disable-next-line no-await-in-loop
            const prepared = await serializeRunActivity(database, run.id, async () => {
                const existing = await getPlaybookRunById(database, run.id);
                const hasMetadata = 'task_activity_sync' in run;
                const sync = parseTaskActivitySync(run.task_activity_sync, true);
                if (hasMetadata && !sync) {
                    throw new Error('Invalid task activity snapshot certificate');
                }
                if (sync && (!Array.isArray(run.timeline_events) || !Array.isArray(run.checklists))) {
                    throw new Error('Incomplete task activity snapshot');
                }
                if (existing?.taskActivityEpoch) {
                    if (!sync) {
                        if (!allowEpochChange) {
                            throw new Error('Task activity baseline requires full run recovery');
                        }
                    }
                    if (sync && existing.taskActivityEpoch !== sync.epoch && !allowEpochChange) {
                        throw new Error('Task activity epoch requires full run recovery');
                    }
                    if (sync && existing.taskActivityEpoch === sync.epoch && existing.taskActivityRevision &&
                        compareTaskActivityRevisions(sync.revision, existing.taskActivityRevision) < 0) {
                        return [];
                    }
                }

                const events = Array.isArray(run.timeline_events) ? run.timeline_events.filter((event) => event?.event_type === 'task_state_modified') : [];
                if (sync) {
                    if (events.some((event) => !isConsumedTimelineEvent(event)) || hasMissingStateLinks(run)) {
                        throw new Error('Invalid task activity snapshot');
                    }
                    const byEventId = new Map(events.map((event) => [event.id, event]));
                    if (hasInvalidStateLinks(run, byEventId)) {
                        throw new Error('Invalid task activity state-event link');
                    }
                }

                const raw: PlaybookRun & {timeline_events_synced_at?: number; task_activity_clear_certificate?: boolean} = {...run};
                if (existing?.taskActivityEpoch && !sync && allowEpochChange) {
                    raw.task_activity_clear_certificate = true;
                    raw.checklists = clearLegacyStateLinks(run.checklists);
                }
                if (!sync && processChildren && Array.isArray(run.timeline_events)) {
                    raw.timeline_events_synced_at = Date.now();
                }
                const restore = await captureRunActivityState(database, run.id);
                try {
                    const models = await operator.handlePlaybookRun({
                        runs: [raw],
                        prepareRecordsOnly: true,
                        processChildren,
                    });
                    if (processChildren && Array.isArray(run.timeline_events)) {
                        models.push(...await prepareTimelineEvents(database, run.id, events, [], true));
                    }
                    if (sync && processChildren) {
                        const currentLists = await database.get(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST).query(Q.where('run_id', run.id)).fetch();
                        const incomingLists = new Map(run.checklists.map((checklist) => [checklist.id, checklist]));
                        for (const list of currentLists) {
                            const incoming = incomingLists.get(list.id);
                            if (!incoming) {
                                models.push(list.prepareDestroyPermanently());
                            }
                            // eslint-disable-next-line no-await-in-loop
                            const currentItems = await database.get(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).query(Q.where('checklist_id', list.id)).fetch();
                            const incomingIds = new Set(incoming?.items.map((item) => item.id) ?? []);
                            models.push(...currentItems.filter((item) => !incomingIds.has(item.id)).map((item) => item.prepareDestroyPermanently()));
                        }
                    }
                    if (!prepareRecordsOnly && models.length) {
                        await operator.batchRecords(models, 'handlePlaybookRuns');
                    }
                    return models;
                } catch (error) {
                    restore();
                    throw error;
                }
            });
            data.push(...prepared);
        }
        return {data};
    } catch (error) {
        logError('failed to handle playbook checklist', error);
        return {error};
    }
}

export async function setOwner(serverUrl: string, playbookRunId: string, ownerId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const run = await getPlaybookRunById(database, playbookRunId);
        if (!run) {
            return {error: 'Checklist not found'};
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

export async function updatePlaybookRun(serverUrl: string, playbookRunId: string, name: string, summary?: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const run = await getPlaybookRunById(database, playbookRunId);
        if (!run) {
            return {error: `Playbook run not found: ${playbookRunId}`};
        }

        // Validate name is not empty or whitespace-only
        if (!name || !name.trim()) {
            return {error: 'Name cannot be empty or whitespace-only'};
        }

        await database.write(async () => {
            run.update((r) => {
                r.name = name.trim();
                if (summary !== undefined) {
                    r.summary = summary.trim();
                }
            });
        });

        return {data: true};
    } catch (error) {
        logError('[updatePlaybookRun]', error);
        return {error};
    }
}
