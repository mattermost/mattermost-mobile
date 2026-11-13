// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTaskActivity} from './task_activity';

const makeItem = (overrides: Partial<PlaybookChecklistItem> = {}) => ({
    id: 'item-1',
    title: 'Deploy release',
    description: '',
    state: 'closed' as ChecklistItemState,
    state_modified: 1000,
    assignee_id: '',
    assignee_modified: 0,
    command: '',
    command_last_run: 0,
    due_date: 0,
    completed_at: 0,
    update_at: 0,
    ...overrides,
});

const makeEvent = (action: string, overrides: Partial<TimelineEvent> = {}, itemId?: string): TimelineEvent => ({
    id: 'event-1',
    playbook_run_id: 'run-1',
    create_at: 1000,
    event_at: 1000,
    event_type: 'task_state_modified',
    summary: '',
    details: JSON.stringify({action, item_id: itemId}),
    post_id: '',
    subject_user_id: 'user-1',
    creator_user_id: '',
    ...overrides,
});

describe('getTaskActivity', () => {
    it.each<[ChecklistItemState, string]>([
        ['closed', 'check'],
        ['', 'uncheck'],
        ['', 'restore'],
        ['skipped', 'skip'],
    ])('should take the action and actor from the matching event for a %p task', (state, action) => {
        expect(getTaskActivity(makeItem({state}), [makeEvent(action)])).toEqual({action, actorUserId: 'user-1', timestamp: 1000});
    });

    it('should keep the time but show no actor for a checked task when no event matches', () => {
        expect(getTaskActivity(makeItem(), [])).toEqual({action: 'check', actorUserId: undefined, timestamp: 1000});
    });

    it.each([8.7e15, Infinity, -1])('should show nothing for state_modified %p, which a Date cannot format', (timestamp) => {
        expect(getTaskActivity(makeItem({state_modified: timestamp}), [makeEvent('check', {event_at: timestamp})])).toBeUndefined();
    });

    it.each<ChecklistItemState>(['', 'skipped'])('should show nothing for a %p task with no matching event', (state) => {
        expect(getTaskActivity(makeItem({state}), [makeEvent('check')])).toBeUndefined();
    });

    it.each([
        makeEvent('skip'),
        makeEvent('check', {event_at: 999}),
        makeEvent('check', {event_type: 'status_updated'}),
        makeEvent('check', {details: '{invalid'}),
        makeEvent('check', {}, 'item-2'),
    ])('should ignore an event with the wrong action, time, type, details or item', (event) => {
        expect(getTaskActivity(makeItem(), [event])?.actorUserId).toBeUndefined();
    });

    it('should use item_id to pick between events at the same time', () => {
        const ours = makeEvent('check', {}, 'item-1');
        const theirs = makeEvent('check', {id: 'event-2', subject_user_id: 'user-2'}, 'item-2');

        expect(getTaskActivity(makeItem(), [theirs, ours])?.actorUserId).toBe('user-1');
    });

    it('should show no actor when events without item_id are ambiguous', () => {
        const other = makeEvent('check', {id: 'event-2', subject_user_id: 'user-2'});

        expect(getTaskActivity(makeItem(), [makeEvent('check'), other])?.actorUserId).toBeUndefined();
    });
});
