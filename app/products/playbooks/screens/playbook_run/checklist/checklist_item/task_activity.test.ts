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

const makeEvent = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
    id: 'event-1',
    playbook_run_id: 'run-1',
    create_at: 1000,
    event_at: 1000,
    event_type: 'task_state_modified',
    summary: '',
    details: JSON.stringify({action: 'check', task: 'Deploy release'}),
    post_id: '',
    subject_user_id: 'user-1',
    creator_user_id: '',
    ...overrides,
});

describe('getTaskActivity', () => {
    it('returns the checked action, timestamp, and actor for one exact event', () => {
        expect(getTaskActivity(makeItem(), [makeEvent()])).toEqual({
            action: 'check',
            actorUserId: 'user-1',
            timestamp: 1000,
        });
    });

    it.each<ChecklistItemState>(['open', ''])('returns the unchecked action for the mobile open state %p', (state) => {
        const event = makeEvent({details: JSON.stringify({action: 'uncheck', task: 'Deploy release'})});

        expect(getTaskActivity(makeItem({state}), [event])).toEqual({
            action: 'uncheck',
            actorUserId: 'user-1',
            timestamp: 1000,
        });
    });

    it('keeps the action time when no actor event can be matched', () => {
        expect(getTaskActivity(makeItem(), [])).toEqual({
            action: 'check',
            actorUserId: undefined,
            timestamp: 1000,
        });
    });

    it.each([
        makeItem({state: 'open', state_modified: 0}),
        makeItem({state: 'skipped'}),
        makeItem({state: 'in_progress'}),
    ])('does not show activity for untouched, skipped, or in-progress tasks', (item) => {
        expect(getTaskActivity(item, [makeEvent()])).toBeUndefined();
    });

    it.each([
        makeEvent({details: '{invalid'}),
        makeEvent({details: JSON.stringify({action: 'uncheck', task: 'Deploy release'})}),
        makeEvent({event_at: 999}),
        makeEvent({event_type: 'status_updated'}),
    ])('ignores malformed details and events with the wrong action, time, or type', (event) => {
        expect(getTaskActivity(makeItem(), [event])?.actorUserId).toBeUndefined();
    });

    it('does not match on title without the exact timestamp', () => {
        const event = makeEvent({event_at: 999, details: JSON.stringify({action: 'check', task: 'Deploy release'})});

        expect(getTaskActivity(makeItem(), [event])?.actorUserId).toBeUndefined();
    });

    it('uses the unique title match to break a same-millisecond collision', () => {
        const other = makeEvent({id: 'event-2', subject_user_id: 'user-2', details: JSON.stringify({action: 'check', task: 'Other task'})});

        expect(getTaskActivity(makeItem(), [other, makeEvent()])?.actorUserId).toBe('user-1');
    });

    it('does not attribute an actor when a same-millisecond collision remains ambiguous', () => {
        const duplicate = makeEvent({id: 'event-2', subject_user_id: 'user-2'});

        expect(getTaskActivity(makeItem(), [makeEvent(), duplicate])?.actorUserId).toBeUndefined();
    });

    it('accepts a single action/time match without requiring a title match', () => {
        const event = makeEvent({details: JSON.stringify({action: 'check', task: 'Old task title'})});

        expect(getTaskActivity(makeItem(), [event])?.actorUserId).toBe('user-1');
    });
});
