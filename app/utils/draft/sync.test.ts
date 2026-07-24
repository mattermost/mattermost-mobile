// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {buildDraftUpsertRequest, isSyncableDraft, normalizeServerDraft, reconstructDraftBoRConfig} from './sync';

const baseServerDraft: DraftApi = {
    create_at: 100,
    update_at: 200,
    delete_at: 0,
    user_id: 'user_id',
    channel_id: 'channel_id',
    root_id: '',
    message: 'server message',
    type: '',
    props: {from_webhook: 'true'},
    file_ids: ['file1', 'file2'],
};

describe('normalizeServerDraft (server -> mobile)', () => {
    it('should map update_at to serverUpdateAt, pass props through, and copy file_ids exactly', () => {
        const result = normalizeServerDraft(baseServerDraft);

        expect(result.channelId).toBe('channel_id');
        expect(result.rootId).toBe('');
        expect(result.message).toBe('server message');
        expect(result.serverUpdateAt).toBe(200);
        expect(result.props).toEqual({from_webhook: 'true'});
        expect(result.fileIds).toEqual(['file1', 'file2']);
        expect(result.fileIds).toHaveLength(2);
    });

    it('should copy file_ids exactly even when metadata.files is missing, and default files to empty', () => {
        const result = normalizeServerDraft(baseServerDraft);

        expect(result.fileIds).toEqual(['file1', 'file2']);
        expect(result.files).toEqual([]);
        expect(result.files).toHaveLength(0);
    });

    it('should hydrate files from metadata.files', () => {
        const file1 = TestHelper.fakeFileInfo({id: 'file1'});
        const file2 = TestHelper.fakeFileInfo({id: 'file2'});
        const serverDraft: DraftApi = {
            ...baseServerDraft,
            metadata: {files: [file1, file2]},
        };

        const result = normalizeServerDraft(serverDraft);

        expect(result.files).toEqual([file1, file2]);
        expect(result.files).toHaveLength(2);
    });

    it('should map priority into metadata.priority', () => {
        const priority: PostPriority = {priority: 'urgent', requested_ack: true};
        const serverDraft: DraftApi = {...baseServerDraft, priority};

        const result = normalizeServerDraft(serverDraft);

        expect(result.metadata?.priority).toEqual(priority);
    });

    it('should leave metadata undefined when there is no priority or borConfig', () => {
        const result = normalizeServerDraft(baseServerDraft);

        expect(result.metadata).toBeUndefined();
    });

    it('should reconstruct borConfig for a burn_on_read draft when durations are valid', () => {
        const serverDraft: DraftApi = {...baseServerDraft, type: 'burn_on_read'};

        const result = normalizeServerDraft(serverDraft, {borDurationSeconds: 30, borMaximumTimeToLiveSeconds: 300});

        expect(result.type).toBe('burn_on_read');
        expect(result.metadata?.borConfig).toEqual({
            enabled: true,
            borDurationSeconds: 30,
            borMaximumTimeToLiveSeconds: 300,
        });
    });

    it('should not set an enabled borConfig for a burn_on_read draft when durations are missing (fail closed)', () => {
        const serverDraft: DraftApi = {...baseServerDraft, type: 'burn_on_read'};

        const result = normalizeServerDraft(serverDraft);

        expect(result.metadata?.borConfig).toBeUndefined();
    });
});

describe('isSyncableDraft', () => {
    const draft = {
        channelId: 'channel_id',
        rootId: '',
        type: '' as PostTypesUserCreatable,
        props: null,
        fileIds: [],
    };

    it('should be true when the draft has message content', () => {
        expect(isSyncableDraft({...draft, message: 'hello'})).toBe(true);
    });

    it('should be false for an empty message even with attachments and priority', () => {
        const emptyDraft = {
            ...draft,
            message: '',
            fileIds: ['file1'],
            metadata: {priority: {priority: 'urgent'} as PostPriority},
        };

        expect(isSyncableDraft(emptyDraft)).toBe(false);
    });
});

describe('buildDraftUpsertRequest (mobile -> server)', () => {
    it('should send only the allowed fields, with file_ids from fileIds and priority from metadata', () => {
        const draft = {
            channelId: 'channel_id',
            rootId: 'root_id',
            message: 'draft message',
            type: '' as PostTypesUserCreatable,
            props: {from_webhook: 'true'},
            fileIds: ['file1'],
            metadata: {priority: {priority: 'important'} as PostPriority},
        };

        const request = buildDraftUpsertRequest(draft);

        expect(request).toEqual({
            channel_id: 'channel_id',
            root_id: 'root_id',
            message: 'draft message',
            type: '',
            props: {from_webhook: 'true'},
            file_ids: ['file1'],
            priority: {priority: 'important'},
        });
    });

    it('should never serialize local-only file fields', () => {
        const draft = {
            channelId: 'channel_id',
            rootId: '',
            message: 'draft message',
            type: '' as PostTypesUserCreatable,
            props: null,
            fileIds: ['file1'],
            metadata: {
                files: [TestHelper.fakeFileInfo({id: 'file1', localPath: '/tmp/x', clientId: 'c1', bytesRead: 5, failed: true})],
            },
        };

        const request = buildDraftUpsertRequest(draft);

        const serialized = JSON.stringify(request);
        expect(serialized).not.toContain('localPath');
        expect(serialized).not.toContain('clientId');
        expect(serialized).not.toContain('bytesRead');
        expect(serialized).not.toContain('failed');
        expect(request?.file_ids).toEqual(['file1']);
    });

    it('should return null for an empty message so it never POSTs', () => {
        const draft = {
            channelId: 'channel_id',
            rootId: '',
            message: '',
            type: '' as PostTypesUserCreatable,
            props: null,
            fileIds: [],
        };

        expect(buildDraftUpsertRequest(draft)).toBeNull();
    });
});

describe('reconstructDraftBoRConfig', () => {
    it('should return an enabled config for a burn_on_read type with valid durations', () => {
        expect(reconstructDraftBoRConfig('burn_on_read', {borDurationSeconds: 30, borMaximumTimeToLiveSeconds: 300})).toEqual({
            enabled: true,
            borDurationSeconds: 30,
            borMaximumTimeToLiveSeconds: 300,
        });
    });

    it('should return null (fail closed) for a burn_on_read type when durations are missing', () => {
        expect(reconstructDraftBoRConfig('burn_on_read', undefined)).toBeNull();
    });

    it('should return null (fail closed) for a burn_on_read type when durations are not positive', () => {
        expect(reconstructDraftBoRConfig('burn_on_read', {borDurationSeconds: 0, borMaximumTimeToLiveSeconds: 300})).toBeNull();
    });

    it('should return null for a non burn_on_read type', () => {
        expect(reconstructDraftBoRConfig('', {borDurationSeconds: 30, borMaximumTimeToLiveSeconds: 300})).toBeNull();
    });
});
