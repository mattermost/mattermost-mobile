// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shouldUpdateScheduledPostRecord} from './scheduled_post';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

const existing = (updateAt: number, overrides: Partial<ScheduledPostModel> = {}) =>
    ({updateAt, repeatType: '', repeatTimezone: '', ...overrides} as ScheduledPostModel);

describe('shouldUpdateScheduledPostRecord', () => {
    it('returns true when new update_at is greater than existing updateAt', () => {
        const newPost = {update_at: 2000} as ScheduledPost;
        expect(shouldUpdateScheduledPostRecord(existing(1000), newPost)).toBe(true);
    });

    it('returns false when new update_at is equal to existing updateAt', () => {
        const newPost = {update_at: 2000} as ScheduledPost;
        expect(shouldUpdateScheduledPostRecord(existing(2000), newPost)).toBe(false);
    });

    it('returns false when new update_at is less than existing updateAt', () => {
        const newPost = {update_at: 2000} as ScheduledPost;
        expect(shouldUpdateScheduledPostRecord(existing(3000), newPost)).toBe(false);
    });

    it('returns true when a row cached before the recurrence columns existed is weekly on the server', () => {
        const newPost = {update_at: 2000, repeat_type: 'weekly', repeat_timezone: 'America/Toronto'} as ScheduledPost;
        expect(shouldUpdateScheduledPostRecord(existing(2000), newPost)).toBe(true);
    });

    it('returns true when only the repeat timezone differs', () => {
        const newPost = {update_at: 2000, repeat_type: 'weekly', repeat_timezone: 'Europe/Paris'} as ScheduledPost;
        expect(shouldUpdateScheduledPostRecord(existing(2000, {repeatType: 'weekly', repeatTimezone: 'America/Toronto'}), newPost)).toBe(true);
    });

    it('returns false when the recurrence matches and update_at is not newer', () => {
        const newPost = {update_at: 2000, repeat_type: 'weekly', repeat_timezone: 'America/Toronto'} as ScheduledPost;
        expect(shouldUpdateScheduledPostRecord(existing(2000, {repeatType: 'weekly', repeatTimezone: 'America/Toronto'}), newPost)).toBe(false);
    });
});
