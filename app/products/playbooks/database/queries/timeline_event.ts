// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of} from 'rxjs';
import {map} from 'rxjs/operators';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookTimelineEventModel from '@playbooks/types/database/models/playbook_timeline_event';

const EVENT_COLUMNS = ['event_type', 'details', 'subject_user_id', 'event_at'];

export const queryPlaybookTimelineEventsForRun = (database: Database, runId: string) =>
    database.get<PlaybookTimelineEventModel>(PLAYBOOK_TABLES.PLAYBOOK_TIMELINE_EVENT).query(
        Q.where('run_id', runId),
        Q.sortBy('event_at', 'asc'),
    );

export const observeTaskActivity = (database: Database, runId: string, item: PlaybookChecklistItemModel) => {
    if (item.stateEventLinkKnown && !item.stateEventId) {
        return of([] as TimelineEvent[]);
    }

    if (!item.stateEventId && !item.stateModified) {
        return of([] as TimelineEvent[]);
    }

    const query = database.get<PlaybookTimelineEventModel>(PLAYBOOK_TABLES.PLAYBOOK_TIMELINE_EVENT).query(
        Q.where('run_id', runId),
        item.stateEventId ? Q.where('id', item.stateEventId) : Q.where('event_at', item.stateModified),
    );

    return query.observeWithColumns(EVENT_COLUMNS).pipe(
        map((events) => events.map((event) => event.toTimelineEvent())),
    );
};
