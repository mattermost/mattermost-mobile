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

    it('should return true when condition_action changes even if update_at is the same', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistItemModel({
            updateAt: 112233,
            conditionAction: '',
        });
        const raw = TestHelper.fakePlaybookChecklistItem(existingRecord.checklistId, {
            update_at: 112233,
            condition_action: 'hidden',
        });

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(true);
    });

    it('should return true when condition_reason changes even if update_at is the same', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistItemModel({
            updateAt: 112233,
            conditionReason: '',
        });
        const raw = TestHelper.fakePlaybookChecklistItem(existingRecord.checklistId, {
            update_at: 112233,
            condition_reason: 'Dependent task not completed',
        });

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(true);
    });

    it('should return false when condition fields are unchanged and update_at is the same', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistItemModel({
            updateAt: 112233,
            conditionAction: 'hidden',
            conditionReason: 'Some reason',
        });
        const raw = TestHelper.fakePlaybookChecklistItem(existingRecord.checklistId, {
            update_at: 112233,
            condition_action: 'hidden',
            condition_reason: 'Some reason',
        });

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when condition_action changes from hidden to shown_because_modified', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistItemModel({
            updateAt: 112233,
            conditionAction: 'hidden',
        });
        const raw = TestHelper.fakePlaybookChecklistItem(existingRecord.checklistId, {
            update_at: 112233,
            condition_action: 'shown_because_modified',
        });

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(true);
    });

    it('should return false when condition_action is undefined in raw data', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistItemModel({
            updateAt: 112233,
            conditionAction: 'hidden',
        });
        const raw = TestHelper.fakePlaybookChecklistItem(existingRecord.checklistId, {
            update_at: 112233,
        });
        delete raw.condition_action;

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(false);
    });
});
