// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database, type Model} from '@nozbe/watermelondb';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookTimelineEventModel from '@playbooks/database/models/playbook_timeline_event';

export const isConsumedTimelineEvent = (event: unknown): event is TimelineEvent => {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
        return false;
    }
    const value = event as Partial<TimelineEvent>;
    return value.event_type === 'task_state_modified' &&
        typeof value.id === 'string' && value.id.length > 0 &&
        typeof value.event_at === 'number' && Number.isFinite(value.event_at) &&
        typeof value.details === 'string' &&
        typeof value.subject_user_id === 'string';
};

const setFields = (model: PlaybookTimelineEventModel, runId: string, event: TimelineEvent) => {
    model.runId = runId;
    model.eventAt = event.event_at;
    model.eventType = event.event_type;
    model.details = event.details;
    model.subjectUserId = event.subject_user_id;
    model.createAt = event.create_at ?? 0;
    model.summary = event.summary ?? '';
    model.postId = event.post_id ?? '';
    model.creatorUserId = event.creator_user_id ?? '';
};

export const prepareTimelineEvents = async (
    database: Database,
    runId: string,
    events: TimelineEvent[],
    deletedIds: string[],
    replace: boolean,
): Promise<Model[]> => {
    const input = new Map<string, TimelineEvent>();
    const deleted = new Set<string>();
    for (const id of deletedIds) {
        if (typeof id !== 'string' || !id) {
            throw new Error('Invalid task activity deletion');
        }
        deleted.add(id);
    }

    for (const event of events) {
        if (!isConsumedTimelineEvent(event) || (event.playbook_run_id && event.playbook_run_id !== runId)) {
            throw new Error('Invalid task activity event');
        }
        if (event.delete_at) {
            deleted.add(event.id);
        } else {
            input.set(event.id, event);
        }
    }

    const collection = database.get<PlaybookTimelineEventModel>(PLAYBOOK_TABLES.PLAYBOOK_TIMELINE_EVENT);
    const addressedIds = [...new Set([...input.keys(), ...deleted])];
    if (!replace && !addressedIds.length) {
        return [];
    }
    const existing = await collection.query(
        Q.where('run_id', runId),
        ...(replace ? [] : [Q.where('id', Q.oneOf(addressedIds))]),
    ).fetch();
    const byId = new Map(existing.map((event) => [event.id, event]));

    const models: Model[] = [];
    for (const [id, event] of input) {
        if (deleted.has(id)) {
            continue;
        }
        const current = byId.get(id);
        if (current) {
            models.push(current.prepareUpdate((record) => setFields(record, runId, event)));
        } else {
            // eslint-disable-next-line no-await-in-loop
            const owner = await collection.query(Q.where('id', id)).fetch();
            if (owner.length) {
                throw new Error('Task activity event belongs to another run');
            }
            models.push(collection.prepareCreate((record) => {
                record._raw.id = id;
                setFields(record, runId, event);
            }));
        }
    }

    for (const [id, current] of byId) {
        if (deleted.has(id) || (replace && !input.has(id))) {
            models.push(current.prepareDestroyPermanently());
        }
    }
    return models;
};
