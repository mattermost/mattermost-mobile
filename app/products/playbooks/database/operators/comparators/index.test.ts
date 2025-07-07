// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {shouldUpdatePlaybookRunRecord, shouldHandlePlaybookChecklistRecord, shouldHandlePlaybookChecklistItemRecord} from './';

describe('shouldUpdatePlaybookRunRecord', () => {
    it('should return false when update_at is the same', () => {
        const existingRecord = TestHelper.fakePlaybookRunModel({
            updateAt: 112233,
        });
        const raw = TestHelper.fakePlaybookRun({
            update_at: 112233,
        });

        expect(shouldUpdatePlaybookRunRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when update_at is different', () => {
        const existingRecord = TestHelper.fakePlaybookRunModel({
            updateAt: 112233,
        });
        const raw = TestHelper.fakePlaybookRun({
            update_at: 112234,
        });

        expect(shouldUpdatePlaybookRunRecord(existingRecord, raw)).toBe(true);
    });
});

describe('shouldHandlePlaybookChecklistRecord', () => {
    it('should return false when update_at is the same', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistModel({
            updateAt: 112233,
        });
        const raw = TestHelper.fakePlaybookChecklist(existingRecord.runId, {
            update_at: 112233,
        });

        expect(shouldHandlePlaybookChecklistRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when update_at is different', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistModel({
            updateAt: 112233,
        });
        const raw = TestHelper.fakePlaybookChecklist(existingRecord.runId, {
            update_at: 112234,
        });

        expect(shouldHandlePlaybookChecklistRecord(existingRecord, raw)).toBe(true);
    });
});

describe('shouldHandlePlaybookChecklistItemRecord', () => {
    it('should return false when update_at is the same', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistItemModel({
            updateAt: 112233,
        });
        const raw = TestHelper.fakePlaybookChecklistItem(existingRecord.checklistId, {
            update_at: 112233,
        });

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when update_at is different', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistItemModel({
            updateAt: 112233,
        });
        const raw = TestHelper.fakePlaybookChecklistItem(existingRecord.checklistId, {
            update_at: 112234,
        });

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(true);
    });
});
