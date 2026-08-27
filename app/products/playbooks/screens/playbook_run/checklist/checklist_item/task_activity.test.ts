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
    // A run absent from the database has its events read straight off the API response, where the
    // plugin's nil timeline slice can serialize to null. A default parameter only covers undefined.
    it('treats a null event list as no events, since the API can send null for an empty timeline', () => {
        expect(getTaskActivity(makeItem(), null as unknown as TimelineEvent[])).toEqual({
            action: 'check',
            timestamp: 1000,
        });
    });

    it('returns the checked action, timestamp, and actor for one exact event', () => {
        expect(getTaskActivity(makeItem(), [makeEvent()])).toEqual({
            action: 'check',
            actorUserId: 'user-1',
            timestamp: 1000,
        });
    });

    it('returns the unchecked action for an open task', () => {
        const event = makeEvent({details: JSON.stringify({action: 'uncheck', task: 'Deploy release'})});

        expect(getTaskActivity(makeItem({state: ''}), [event])).toEqual({
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
        makeItem({state: '', state_modified: 0}),
        makeItem({state: 'in_progress'}),
    ])('does not show activity for untouched or in-progress tasks', (item) => {
        expect(getTaskActivity(item, [makeEvent()])).toBeUndefined();
    });

    it('returns the skip action and actor for a skipped task', () => {
        const event = makeEvent({details: JSON.stringify({action: 'skip', task: 'Deploy release'})});

        expect(getTaskActivity(makeItem({state: 'skipped'}), [event])).toEqual({
            action: 'skip',
            actorUserId: 'user-1',
            timestamp: 1000,
        });
    });

    it.each([
        makeItem({state: 'skipped', state_modified: 1000}),
        makeItem({state: 'skipped', state_modified: 0}),
    ])('shows nothing for a skipped task with no skip event, since state_modified is not the skip time', (item) => {
        // The /skip route records neither state_modified nor a timeline event, so a non-zero
        // state_modified here is a leftover from an earlier check/uncheck.
        expect(getTaskActivity(item, [makeEvent()])).toBeUndefined();
    });

    it('returns the restore action for an open task whose event says it was restored', () => {
        const event = makeEvent({details: JSON.stringify({action: 'restore', task: 'Deploy release'})});

        expect(getTaskActivity(makeItem({state: ''}), [event])).toEqual({
            action: 'restore',
            actorUserId: 'user-1',
            timestamp: 1000,
        });
    });

    it('falls back to uncheck for an open task with no matching event, since open cannot distinguish it from a restore', () => {
        expect(getTaskActivity(makeItem({state: ''}), [])).toEqual({
            action: 'uncheck',
            actorUserId: undefined,
            timestamp: 1000,
        });
    });

    it.each<[ChecklistItemState, string]>([
        ['closed', 'skip'],
        ['skipped', 'check'],
        ['', 'check'],
    ])('ignores an event whose action the %p state could not have produced (%p)', (state, action) => {
        const event = makeEvent({details: JSON.stringify({action, task: 'Deploy release'})});

        expect(getTaskActivity(makeItem({state}), [event])?.actorUserId).toBeUndefined();
    });

    it.each([
        makeEvent({details: '{invalid'}),
        makeEvent({details: JSON.stringify({action: 'uncheck', task: 'Deploy release'})}),
        makeEvent({event_at: 999}),
        makeEvent({event_type: 'status_updated'}),
    ])('ignores malformed details and events with the wrong action, time, or type', (event) => {
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

    describe('item_id matching', () => {
        const withItemId = (itemId: string, overrides: Partial<TimelineEvent> = {}) => makeEvent({
            details: JSON.stringify({action: 'check', task: 'Deploy release', item_id: itemId}),
            ...overrides,
        });

        // Removing the item_id join leaves the rest of this block green — they all resolve through
        // the legacy filter too. Here the legacy path sees two candidates and bails on the title.
        it('prefers an id-carrying event for us over a co-timestamped legacy event', () => {
            const ours = makeEvent({subject_user_id: 'user-1', details: JSON.stringify({action: 'check', task: 'Renamed since', item_id: 'item-1'})});
            const legacy = makeEvent({id: 'event-2', subject_user_id: 'user-2', details: JSON.stringify({action: 'check', task: 'Other task'})});

            expect(getTaskActivity(makeItem(), [ours, legacy])?.actorUserId).toBe('user-1');
        });

        it('uses item_id to resolve a same-millisecond collision that the title cannot', () => {
            // Both events share the timestamp and the title, so only item_id tells them apart.
            const ours = withItemId('item-1', {subject_user_id: 'user-1'});
            const theirs = withItemId('item-2', {id: 'event-2', subject_user_id: 'user-2'});

            expect(getTaskActivity(makeItem(), [theirs, ours])?.actorUserId).toBe('user-1');
        });

        it('never attributes an event that names a different item', () => {
            const other = withItemId('item-2', {subject_user_id: 'user-2'});

            expect(getTaskActivity(makeItem(), [other])?.actorUserId).toBeUndefined();
        });

        it('matches our legacy event while ignoring an id-carrying event for another item', () => {
            // Without excluding the other item's event, the title tiebreak would see both and bail.
            const ours = makeEvent({subject_user_id: 'user-1'});
            const theirs = withItemId('item-2', {id: 'event-2', subject_user_id: 'user-2'});

            expect(getTaskActivity(makeItem(), [theirs, ours])?.actorUserId).toBe('user-1');
        });

        it('resolves a markdown title via item_id, which the stripped-title tiebreak cannot', () => {
            // The server writes details.task with markdown stripped, so it never equals the raw title.
            const ours = withItemId('item-1', {subject_user_id: 'user-1'});
            const theirs = withItemId('item-2', {id: 'event-2', subject_user_id: 'user-2'});

            expect(getTaskActivity(makeItem({title: '**Deploy** release'}), [theirs, ours])?.actorUserId).toBe('user-1');
        });
    });
});
