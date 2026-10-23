// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {compareTaskActivityRevisions, isValidCertifiedTaskLink, parseTaskActivitySync} from './task_activity_sync';

describe('task activity certificate', () => {
    it('should compare decimal revisions beyond JavaScript safe integer range', () => {
        expect(compareTaskActivityRevisions('9007199254740993', '9007199254740992')).toBeGreaterThan(0);
        expect(compareTaskActivityRevisions('10000000000000000', '9999999999999999')).toBeGreaterThan(0);
    });

    it('should reject malformed or incomplete revision metadata', () => {
        expect(parseTaskActivitySync({version: 1, epoch: 'a', revision: '01', complete: true}, true)).toBeUndefined();
        expect(parseTaskActivitySync({version: 1, epoch: 'a', revision: '2', complete: false}, false)).toBeUndefined();
        expect(parseTaskActivitySync({version: 1, epoch: 'a', revision: '2', base_revision: '1', complete: false}, false)).toBeDefined();
    });

    it('should reject a linked event for another task even when its timestamp matches', () => {
        const item = {id: 'item-a', state: 'closed', state_modified: 1000, state_event_id: 'event-a'} as PlaybookChecklistItem;
        const event = {
            id: 'event-a',
            playbook_run_id: 'run-a',
            event_at: 1000,
            details: '{"action":"check","item_id":"item-b"}',
        } as TimelineEvent;
        expect(isValidCertifiedTaskLink(item, event, 'run-a')).toBe(false);
        expect(isValidCertifiedTaskLink(item, {...event, details: '{"action":"check","item_id":"item-a"}'}, 'run-a')).toBe(true);
    });
});
