// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shouldUpdateScheduledPostRecord} from './scheduled_post';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

describe('shouldUpdateScheduledPostRecord', () => {
    it('returns true when new update_at is greater than existing updateAt', () => {
        const existingPost = {updateAt: 1000} as ScheduledPostModel;
        const newPost = {update_at: 2000} as ScheduledPost;
        expect(shouldUpdateScheduledPostRecord(existingPost, newPost)).toBe(true);
    });

    it('returns false when new update_at is equal to existing updateAt', () => {
        const existingPost = {updateAt: 2000} as ScheduledPostModel;
        const newPost = {update_at: 2000} as ScheduledPost;
        expect(shouldUpdateScheduledPostRecord(existingPost, newPost)).toBe(false);
    });

    it('returns false when new update_at is less than existing updateAt', () => {
        const existingPost = {updateAt: 3000} as ScheduledPostModel;
        const newPost = {update_at: 2000} as ScheduledPost;
        expect(shouldUpdateScheduledPostRecord(existingPost, newPost)).toBe(false);
    });
});
