// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import {captureRunActivityState, serializeRunActivity} from '@playbooks/actions/local/task_activity';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {isConsumedTimelineEvent, prepareTimelineEvents} from '@playbooks/database/operators/handlers/timeline_event';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import {compareTaskActivityRevisions, isValidCertifiedTaskLink, parseTaskActivitySync} from '@playbooks/utils/task_activity_sync';
import {logError, logWarning} from '@utils/log';

const hasMissingStateLinks = (run: PlaybookRun) => run.checklists.some((checklist) =>
    checklist.items.some((item) => !('state_event_id' in item)));

const invalidStateLinkItemIds = (run: PlaybookRun, byEventId: Map<string, TimelineEvent>) => new Set(run.checklists.flatMap((checklist) =>
    checklist.items.
        filter((item) => !isValidCertifiedTaskLink(item, item.state_event_id ? byEventId.get(item.state_event_id) : undefined, run.id)).
        map((item) => item.id)));

// An unknown link makes the task fall back to matching events by item. Without itemIds, every
// task's link is marked unknown.
const markStateLinksUnknown = (checklists: PlaybookChecklist[], itemIds?: Set<string>) => checklists.map((checklist) => ({
    ...checklist,
    items: checklist.items.map((item) => (!itemIds || itemIds.has(item.id) ? {...item, state_event_link_known: false} : item)),
}));

export async function handlePlaybookRuns(serverUrl: string, runs: PlaybookRun[], prepareRecordsOnly = false, processChildren = false, allowEpochChange = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const data: Model[] = [];
        const failedRunIds: string[] = [];
        let runError: unknown;
        for (const run of runs) {
            try {
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
                    let invalidLinks = new Set<string>();
                    if (sync) {
                        if (events.some((event) => !isConsumedTimelineEvent(event)) || hasMissingStateLinks(run)) {
                            throw new Error('Invalid task activity snapshot');
                        }
                        const byEventId = new Map(events.map((event) => [event.id, event]));

                        // A bad link costs only that task its certified attribution, not the whole run.
                        invalidLinks = invalidStateLinkItemIds(run, byEventId);
                        if (invalidLinks.size) {
                            logWarning('playbook run has task state-event links that do not match their events', run.id, [...invalidLinks]);
                        }
                    }

                    const raw: PlaybookRun & {timeline_events_synced_at?: number; task_activity_clear_certificate?: boolean} = {...run};
                    if (!sync && Array.isArray(run.checklists)) {
                    // Without a certificate the server's links are not authoritative: tasks
                    // checked before the server started recording links arrive with null.
                        raw.checklists = markStateLinksUnknown(run.checklists);
                    } else if (invalidLinks.size) {
                        raw.checklists = markStateLinksUnknown(run.checklists, invalidLinks);
                    }
                    if (existing?.taskActivityEpoch && !sync && allowEpochChange) {
                        raw.task_activity_clear_certificate = true;
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
            } catch (error) {
                logError('failed to handle playbook run', run.id, error);
                failedRunIds.push(run.id);
                runError ??= error;
            }
        }

        // The error is still reported so single-run callers recover as before; batch callers
        // recover failedRunIds individually and keep the runs that were stored.
        return failedRunIds.length ? {data, error: runError, failedRunIds} : {data};
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
