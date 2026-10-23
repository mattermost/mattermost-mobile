// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import DatabaseManager from '@database/manager';
import {prepareTimelineEvents} from '@playbooks/database/operators/handlers/timeline_event';
import TestHelper from '@test/test_helper';

import {observeTaskActivity} from './timeline_event';

const serverUrl = 'timeline_event_query.test';

describe('observeTaskActivity', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should select only the linked event and preserve legacy timestamp collisions', async () => {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const event = (id: string, runId: string): TimelineEvent => ({
            id,
            playbook_run_id: runId,
            create_at: 1,
            event_at: 1000,
            event_type: 'task_state_modified',
            details: '{"action":"check"}',
            summary: '',
            post_id: '',
            subject_user_id: id,
            creator_user_id: '',
        });
        const events = [event('event-a', 'run-a'), event('event-b', 'run-a'), event('event-c', 'run-b')];
        for (const runId of ['run-a', 'run-b']) {
            // eslint-disable-next-line no-await-in-loop
            const prepared = await prepareTimelineEvents(database, runId, events.filter((value) => value.playbook_run_id === runId), [], true);
            // eslint-disable-next-line no-await-in-loop
            await operator.batchRecords(prepared, 'seed task events');
        }

        const linked = TestHelper.fakePlaybookChecklistItemModel({stateModified: 1000, stateEventId: 'event-b', stateEventLinkKnown: true});
        const explicitNull = TestHelper.fakePlaybookChecklistItemModel({stateModified: 1000, stateEventId: null, stateEventLinkKnown: true});
        const legacy = TestHelper.fakePlaybookChecklistItemModel({stateModified: 1000, stateEventId: null, stateEventLinkKnown: false});
        expect((await firstValueFrom(observeTaskActivity(database, 'run-a', linked))).map((value) => value.id)).toEqual(['event-b']);
        expect(await firstValueFrom(observeTaskActivity(database, 'run-a', explicitNull))).toEqual([]);
        expect((await firstValueFrom(observeTaskActivity(database, 'run-a', legacy))).map((value) => value.id).sort()).toEqual(['event-a', 'event-b']);
    });
});
