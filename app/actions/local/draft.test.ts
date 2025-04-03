// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import DatabaseManager from '@database/manager';

import {
    updateDraftFile,
    removeDraftFile,
    updateDraftMessage,
    addFilesToDraft,
    removeDraft,
    updateDraftPriority,
    updateDraftMarkdownImageMetadata,
} from './draft';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type DraftModel from '@typings/database/models/servers/draft';

let operator: ServerDataOperator;
const serverUrl = 'baseHandler.test.com';
const channelId = 'id1';
const teamId = 'tId1';
const channel: Channel = {
    id: channelId,
    team_id: teamId,
    total_msg_count: 0,
} as Channel;
const fileInfo: FileInfo = {
    id: 'fileid',
    clientId: 'clientid',
    localPath: 'path1',
} as FileInfo;
const draft: Draft = {
    channel_id: channel.id,
    message: 'test',
    root_id: '',
    update_at: Date.now(),
} as Draft;

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('updateDraftFile', () => {
    it('handle not found database', async () => {
        const {error} = await updateDraftFile('foo', channelId, '', fileInfo, false);
        expect(error).toBeTruthy();
    });

    it('handle no draft', async () => {
        const {error} = await updateDraftFile(serverUrl, channelId, '', fileInfo, false);
        expect(error).toBeTruthy();
        expect(error).toBe('no draft');
    });

    it('handle no file', async () => {
        await operator.handleDraft({drafts: [draft], prepareRecordsOnly: false});

        const {error} = await updateDraftFile(serverUrl, channelId, '', fileInfo, false);
        expect(error).toBeTruthy();
        expect(error).toBe('file not found');
    });

    it('update draft file', async () => {
        await operator.handleDraft({drafts: [{...draft, files: [{...fileInfo, localPath: 'path0'}]}], prepareRecordsOnly: false});

        const {draft: draftModel, error} = await updateDraftFile(serverUrl, channelId, '', fileInfo);
        expect(error).toBeUndefined();
        expect(draftModel).toBeDefined();
        expect(draftModel?.files?.length).toBe(1);
        expect(draftModel?.files![0].localPath).toBe('path1');
    });
});

describe('removeDraftFile', () => {
    it('handle not found database', async () => {
        const {error} = await removeDraftFile('foo', channelId, '', '', false);
        expect(error).toBeTruthy();
    });

    it('handle no draft', async () => {
        const {error} = await removeDraftFile(serverUrl, channelId, '', 'clientid', false);
        expect(error).toBeTruthy();
        expect(error).toBe('no draft');
    });

    it('handle no file', async () => {
        await operator.handleDraft({drafts: [draft], prepareRecordsOnly: false});

        const {error} = await removeDraftFile(serverUrl, channelId, '', 'clientid', false);
        expect(error).toBeTruthy();
        expect(error).toBe('file not found');
    });

    it('remove draft file', async () => {
        await operator.handleDraft({drafts: [{...draft, files: [fileInfo]}], prepareRecordsOnly: false});

        const {draft: draftModel, error} = await removeDraftFile(serverUrl, channelId, '', 'clientid');
        expect(error).toBeUndefined();
        expect(draftModel).toBeDefined();
    });

    it('remove draft file, no message', async () => {
        await operator.handleDraft({drafts: [{channel_id: channel.id, files: [fileInfo], root_id: '', update_at: Date.now()}], prepareRecordsOnly: false});

        const {draft: draftModel, error} = await removeDraftFile(serverUrl, channelId, '', 'clientid', false);
        expect(error).toBeUndefined();
        expect(draftModel).toBeDefined();
    });
});

describe('updateDraftMessage', () => {
    it('handle not found database', async () => {
        const result = await updateDraftMessage('foo', channelId, '', 'newmessage', false) as {draft: unknown; error: unknown};
        expect(result.error).toBeDefined();
        expect(result.draft).toBeUndefined();
    });

    it('update draft message, blank message, no draft', async () => {
        const result = await updateDraftMessage(serverUrl, channelId, '', '', false) as {draft: unknown; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeUndefined();
    });

    it('update draft message, no draft', async () => {
        const models = await updateDraftMessage(serverUrl, channelId, '', 'newmessage', false) as DraftModel[];
        expect(models).toBeDefined();
        expect(models?.length).toBe(1);
    });

    it('update draft message', async () => {
        await operator.handleDraft({drafts: [{...draft, files: [fileInfo]}], prepareRecordsOnly: false});

        const result = await updateDraftMessage(serverUrl, channelId, '', 'newmessage') as {draft: DraftModel; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
        expect(result.draft.message).toBe('newmessage');
    });

    it('update draft message, same message', async () => {
        await operator.handleDraft({drafts: [{...draft, files: [fileInfo]}], prepareRecordsOnly: false});

        const result = await updateDraftMessage(serverUrl, channelId, '', 'test', false) as {draft: DraftModel; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
        expect(result.draft.message).toBe('test');
    });

    it('update draft message, no file', async () => {
        await operator.handleDraft({drafts: [{channel_id: channel.id, files: [], root_id: '', update_at: Date.now()}], prepareRecordsOnly: false});

        const result = await updateDraftMessage(serverUrl, channelId, '', 'newmessage', false) as {draft: DraftModel; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
        expect(result.draft.message).toBe('newmessage');
    });
});

describe('addFilesToDraft', () => {
    it('handle not found database', async () => {
        const result = await addFilesToDraft('foo', channelId, '', [], false) as {draft: unknown; error: unknown};
        expect(result.error).toBeDefined();
        expect(result.draft).toBeUndefined();
    });

    it('add draft files, no draft', async () => {
        const models = await addFilesToDraft(serverUrl, channelId, '', [fileInfo], false) as DraftModel[];
        expect(models).toBeDefined();
        expect(models?.length).toBe(1);
    });

    it('add draft files', async () => {
        await operator.handleDraft({drafts: [draft], prepareRecordsOnly: false});

        const result = await addFilesToDraft(serverUrl, channelId, '', [fileInfo]) as {draft: DraftModel; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
        expect(result?.draft.files.length).toBe(1);
    });
});

describe('removeDraft', () => {
    it('handle not found database', async () => {
        const result = await removeDraft('foo', channelId, '');
        expect(result.error).toBeDefined();
        expect(result.draft).toBeUndefined();
    });

    it('handle no draft', async () => {
        const result = await removeDraft(serverUrl, channelId, '');
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeUndefined();
    });

    it('remove draft', async () => {
        await operator.handleDraft({drafts: [draft], prepareRecordsOnly: false});

        const result = await removeDraft(serverUrl, channelId);
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
    });

    it('remove draft with root id', async () => {
        await operator.handleDraft({drafts: [{...draft, root_id: 'postid'}], prepareRecordsOnly: false});

        const result = await removeDraft(serverUrl, channelId, 'postid');
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
    });
});

describe('updateDraftPriority', () => {
    const postPriority: PostPriority = {
        priority: 'urgent',
    } as PostPriority;

    it('handle not found database', async () => {
        const result = await updateDraftPriority('foo', channelId, '', postPriority) as {draft: unknown; error: unknown};
        expect(result.error).toBeDefined();
        expect(result.draft).toBeUndefined();
    });

    it('handle no draft', async () => {
        const models = await updateDraftPriority(serverUrl, channelId, '', postPriority) as DraftModel[];
        expect(models).toBeDefined();
        expect(models.length).toBe(1);
        expect(models[0].metadata?.priority?.priority).toBe(postPriority.priority);
    });

    it('update draft priority', async () => {
        await operator.handleDraft({drafts: [draft], prepareRecordsOnly: false});

        const result = await updateDraftPriority(serverUrl, channelId, '', postPriority) as {draft: DraftModel; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
        expect(result.draft.metadata?.priority?.priority).toBe(postPriority.priority);
    });
});

describe('updateDraftMarkdownImageMetadata', () => {
    const postImageData: PostImage = {
        height: 1080,
        width: 1920,
        format: 'jpg',
        frame_count: undefined,
    };

    it('handle not found database', async () => {
        const result = await updateDraftMarkdownImageMetadata({
            serverUrl: 'foo',
            channelId,
            rootId: '',
            imageMetadata: {
                image1: postImageData,
            },
        }) as {draft: unknown; error: unknown};
        expect(result.error).toBeDefined();
        expect(result.draft).toBeUndefined();
    });

    it('handle update image metadata', async () => {
        await operator.handleDraft({drafts: [draft], prepareRecordsOnly: false});
        const result = await updateDraftMarkdownImageMetadata({
            serverUrl,
            channelId,
            rootId: '',
            imageMetadata: {
                image1: postImageData,
            },
        }) as {draft: DraftModel; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
        expect(result.draft.metadata?.images?.image1).toEqual(postImageData);
    });
});
