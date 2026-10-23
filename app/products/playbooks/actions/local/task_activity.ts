// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database, type Model} from '@nozbe/watermelondb';

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

const queues = new WeakMap<Database, Map<string, Promise<void>>>();
const visibleRuns = new Map<string, {database: Database; runId: string}>();

export const setVisiblePlaybookRun = (serverUrl: string, runId: string | null) => {
    if (runId) {
        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (database) {
            visibleRuns.set(serverUrl, {database, runId});
        }
    } else {
        visibleRuns.delete(serverUrl);
    }
};

export const getVisiblePlaybookRun = (serverUrl: string) => {
    const visible = visibleRuns.get(serverUrl);
    if (visible && DatabaseManager.serverDatabases[serverUrl]?.database === visible.database) {
        return visible.runId;
    }
    visibleRuns.delete(serverUrl);
    return undefined;
};

type TouchedRunRecords = {checklistIds: string[]; itemIds: string[]; eventIds: string[]};

export const captureRunActivityState = async (database: Database, runId: string, touched?: TouchedRunRecords) => {
    const runs = await database.get(PLAYBOOK_TABLES.PLAYBOOK_RUN).query(Q.where('id', runId)).fetch();
    const checklists = (!touched || touched.checklistIds.length) ? await database.get(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST).query(
        Q.where('run_id', runId),
        ...(touched ? [Q.where('id', Q.oneOf(touched.checklistIds))] : []),
    ).fetch() : [];
    const items = (!touched && checklists.length) || touched?.itemIds.length ? await database.get(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).query(
        ...(touched ? [Q.where('id', Q.oneOf(touched.itemIds))] : [Q.where('checklist_id', Q.oneOf(checklists.map((checklist) => checklist.id)))]),
    ).fetch() : [];
    const events = (!touched || touched.eventIds.length) ? await database.get(PLAYBOOK_TABLES.PLAYBOOK_TIMELINE_EVENT).query(
        Q.where('run_id', runId),
        ...(touched ? [Q.where('id', Q.oneOf(touched.eventIds))] : []),
    ).fetch() : [];
    const records: Model[] = [...runs, ...checklists, ...items, ...events];
    const originals = records.map((record) => ({record, raw: {...record._raw}}));
    return () => {
        // WatermelonDB prepareUpdate mutates cached models before batch commits; restore them if the batch fails.
        for (const {record, raw} of originals) {
            record._raw = raw;
            record._preparedState = null;
        }
    };
};

export const serializeRunActivity = <T>(database: Database, runId: string, apply: () => Promise<T>): Promise<T> => {
    let runQueues = queues.get(database);
    if (!runQueues) {
        runQueues = new Map();
        queues.set(database, runQueues);
    }
    const previous = runQueues.get(runId) ?? Promise.resolve();
    const applied = previous.then(apply, apply);
    const settled = applied.then(() => undefined, () => undefined);
    runQueues.set(runId, settled);
    settled.then(() => {
        if (runQueues?.get(runId) === settled) {
            runQueues.delete(runId);
        }
    });
    return applied;
};
