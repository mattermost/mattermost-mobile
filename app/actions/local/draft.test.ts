// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {Navigation, Screens} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {DRAFT_SCREEN_TAB_DRAFTS, DRAFT_SCREEN_TAB_SCHEDULED_POSTS} from '@constants/draft';
import {PostTypes} from '@constants/post';
import DatabaseManager from '@database/manager';
import {getDraft, getDraftOutbox} from '@queries/servers/drafts';
import {dismissAllRoutesAndPopToScreen} from '@screens/navigation';
import {NavigationStore} from '@store/navigation_store';
import {isTablet} from '@utils/helpers';

import {
    switchToGlobalDrafts,
    updateDraftFile,
    removeDraftFile,
    updateDraftMessage,
    addFilesToDraft,
    removeDraft,
    updateDraftPriority,
    updateDraftBoRConfig,
    updateDraftMarkdownImageMetadata,
} from './draft';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type DraftModel from '@typings/database/models/servers/draft';

let operator: ServerDataOperator | undefined;
let database: Database;
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

jest.mock('@utils/helpers', () => ({
    ...jest.requireActual('@utils/helpers'),
    isTablet: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    dismissAllRoutesAndPopToScreen: jest.fn(),
    navigateToScreen: jest.fn(),
}));

jest.mock('@store/navigation_store', () => ({
    NavigationStore: {
        getScreensInStack: jest.fn().mockReturnValue([]),
        waitUntilScreenHasLoaded: jest.fn().mockResolvedValue(true),
        state: {
            screenStack: [],
        },
    },
}));

describe('draft actions', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        database = DatabaseManager.serverDatabases[serverUrl]!.database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('updateDraftFile', () => {
        it('handle not found database', async () => {
            const {error} = await updateDraftFile('foo', channelId, '', fileInfo);
            expect(error).toBeTruthy();
        });

        it('handle no draft', async () => {
            const {error} = await updateDraftFile(serverUrl, channelId, '', fileInfo);
            expect(error).toBeTruthy();
            expect(error).toBe('no draft');
        });

        it('handle no file', async () => {
            await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});

            const {error} = await updateDraftFile(serverUrl, channelId, '', fileInfo);
            expect(error).toBeTruthy();
            expect(error).toBe('file not found');
        });

        it('update draft file', async () => {
            await operator?.handleDraft({drafts: [{...draft, files: [{...fileInfo, localPath: 'path0'}]}], prepareRecordsOnly: false});

            const {draft: draftModel, error} = await updateDraftFile(serverUrl, channelId, '', fileInfo);
            expect(error).toBeUndefined();
            expect(draftModel).toBeDefined();
            expect(draftModel?.files?.length).toBe(1);
            expect(draftModel?.files?.[0].localPath).toBe('path1');
        });
    });

    describe('removeDraftFile', () => {
        it('handle not found database', async () => {
            const {error} = await removeDraftFile('foo', channelId, '', '');
            expect(error).toBeTruthy();
        });

        it('handle no draft', async () => {
            const {error} = await removeDraftFile(serverUrl, channelId, '', 'clientid');
            expect(error).toBeTruthy();
            expect(error).toBe('no draft');
        });

        it('handle no file', async () => {
            await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});

            const {error} = await removeDraftFile(serverUrl, channelId, '', 'clientid');
            expect(error).toBeTruthy();
            expect(error).toBe('file not found');
        });

        it('remove draft file', async () => {
            await operator?.handleDraft({drafts: [{...draft, files: [fileInfo]}], prepareRecordsOnly: false});

            const {draft: draftModel, error} = await removeDraftFile(serverUrl, channelId, '', 'clientid');
            expect(error).toBeUndefined();
            expect(draftModel).toBeDefined();
        });

        it('remove draft file, no message', async () => {
            await operator?.handleDraft({drafts: [{channel_id: channel.id, files: [fileInfo], root_id: '', update_at: Date.now()}], prepareRecordsOnly: false});

            const {draft: draftModel, error} = await removeDraftFile(serverUrl, channelId, '', 'clientid');
            expect(error).toBeUndefined();
            expect(draftModel).toBeDefined();
        });
    });

    describe('updateDraftMessage', () => {
        it('handle not found database', async () => {
            const result = await updateDraftMessage('foo', channelId, '', 'newmessage') as {draft: unknown; error: unknown};
            expect(result.error).toBeDefined();
            expect(result.draft).toBeUndefined();
        });

        it('update draft message, blank message, no draft', async () => {
            const result = await updateDraftMessage(serverUrl, channelId, '', '') as {draft: unknown; error: unknown};
            expect(result.error).toBeUndefined();
            expect(result.draft).toBeUndefined();
        });

        it('update draft message, no draft', async () => {
            const result = await updateDraftMessage(serverUrl, channelId, '', 'newmessage') as {draft: DraftModel; error: unknown};
            expect(result.error).toBeUndefined();
            expect(result.draft).toBeDefined();
            expect(result.draft.message).toBe('newmessage');

            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe('upsert');
            expect(outbox?.generation).toBe(1);
            expect(outbox?.status).toBe('pending');
        });

        it('update draft message', async () => {
            await operator?.handleDraft({drafts: [{...draft, files: [fileInfo]}], prepareRecordsOnly: false});

            const result = await updateDraftMessage(serverUrl, channelId, '', 'newmessage') as {draft: DraftModel; error: unknown};
            expect(result.error).toBeUndefined();
            expect(result.draft).toBeDefined();
            expect(result.draft.message).toBe('newmessage');
        });

        it('update draft message, same message', async () => {
            await operator?.handleDraft({drafts: [{...draft, files: [fileInfo]}], prepareRecordsOnly: false});

            const result = await updateDraftMessage(serverUrl, channelId, '', 'test') as {draft: DraftModel; error: unknown};
            expect(result.error).toBeUndefined();
            expect(result.draft).toBeDefined();
            expect(result.draft.message).toBe('test');
        });

        it('update draft message, no file', async () => {
            await operator?.handleDraft({drafts: [{channel_id: channel.id, files: [], root_id: '', update_at: Date.now()}], prepareRecordsOnly: false});

            const result = await updateDraftMessage(serverUrl, channelId, '', 'newmessage') as {draft: DraftModel; error: unknown};
            expect(result.error).toBeUndefined();
            expect(result.draft).toBeDefined();
            expect(result.draft.message).toBe('newmessage');
        });
    });

    describe('addFilesToDraft', () => {
        it('handle not found database', async () => {
            const result = await addFilesToDraft('foo', channelId, '', []) as {draft: unknown; error: unknown};
            expect(result.error).toBeDefined();
            expect(result.draft).toBeUndefined();
        });

        it('add draft files, no draft', async () => {
            const result = await addFilesToDraft(serverUrl, channelId, '', [fileInfo]) as {draft: DraftModel; error: unknown};
            expect(result.error).toBeUndefined();
            expect(result.draft).toBeDefined();
            expect(result.draft.files.length).toBe(1);
        });

        it('add draft files', async () => {
            await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});

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
            await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});

            const result = await removeDraft(serverUrl, channelId);
            expect(result.error).toBeUndefined();
            expect(result.draft).toBeDefined();
        });

        it('remove draft with root id', async () => {
            await operator?.handleDraft({drafts: [{...draft, root_id: 'postid'}], prepareRecordsOnly: false});

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
            const result = await updateDraftPriority(serverUrl, channelId, '', postPriority) as {draft: DraftModel; error: unknown};
            expect(result.error).toBeUndefined();
            expect(result.draft).toBeDefined();
            expect(result.draft.metadata?.priority?.priority).toBe(postPriority.priority);

            // Priority-only draft with an empty message is unsyncable: it is parked, never pending.
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe('upsert');
            expect(outbox?.status).toBe('blocked');
            expect(outbox?.lastErrorCode).toBe('unsyncable_empty');
        });

        it('update draft priority', async () => {
            await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});

            const result = await updateDraftPriority(serverUrl, channelId, '', postPriority) as {draft: DraftModel; error: unknown};
            expect(result.error).toBeUndefined();
            expect(result.draft).toBeDefined();
            expect(result.draft.metadata?.priority?.priority).toBe(postPriority.priority);
        });
    });

    describe('draft outbox synchronization intents', () => {
        const {DRAFT, DRAFT_OUTBOX} = MM_TABLES.SERVER;
        const uploadingFile = {clientId: 'up1', localPath: 'path1'} as FileInfo;
        const completedFile = {id: 'srvid1', clientId: 'up1', localPath: 'path1'} as FileInfo;

        const countOutbox = async () => {
            const rows = await database.get(DRAFT_OUTBOX).query(Q.where('channel_id', channelId)).fetch();
            return rows.length;
        };

        it('creates one Draft and one pending upsert outbox on the first non-empty edit', async () => {
            await updateDraftMessage(serverUrl, channelId, '', 'hello');

            const drafts = await database.get(DRAFT).query(Q.where('channel_id', channelId)).fetch();
            expect(drafts.length).toBe(1);
            expect(await countOutbox()).toBe(1);

            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe('upsert');
            expect(outbox?.generation).toBe(1);
            expect(outbox?.status).toBe('pending');
            expect(outbox?.attemptCount).toBe(0);
        });

        it('coalesces repeated edits into a single outbox with an incrementing generation', async () => {
            await updateDraftMessage(serverUrl, channelId, '', 'a');
            await updateDraftMessage(serverUrl, channelId, '', 'b');
            await updateDraftMessage(serverUrl, channelId, '', 'c');

            expect(await countOutbox()).toBe(1);
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe('upsert');
            expect(outbox?.generation).toBe(3);
            expect(outbox?.status).toBe('pending');
        });

        it('removeDraft destroys the draft and queues a non-keepLocal delete with a fingerprint', async () => {
            await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});

            await removeDraft(serverUrl, channelId);

            expect(await getDraft(database, channelId, '')).toBeUndefined();
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe('delete');
            expect(outbox?.keepLocal).toBe(false);
            expect(typeof outbox?.deletedFingerprint).toBe('string');
            expect(outbox?.deletedFingerprint?.length).toBeGreaterThan(0);
        });

        it('clears a synchronized draft to a keepLocal delete while retaining the visible attachment', async () => {
            await database.write(async () => {
                await database.get<DraftModel>(DRAFT).create((d) => {
                    d.channelId = channelId;
                    d.rootId = '';
                    d.message = 'server text';
                    d.updateAt = 1;
                    d.serverUpdateAt = 500;
                    d.files = [fileInfo];
                    d.fileIds = ['fileid'];
                });
            });

            await updateDraftMessage(serverUrl, channelId, '', '');

            const retained = await getDraft(database, channelId, '');
            expect(retained).toBeDefined();
            expect(retained?.message).toBe('');
            expect(retained?.files.length).toBe(1);

            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe('delete');
            expect(outbox?.keepLocal).toBe(true);
            expect(outbox?.deletedFingerprint?.length).toBeGreaterThan(0);
        });

        it('parks an attachment-only draft that was never server-backed instead of enqueuing a delete', async () => {
            // fileInfo carries a server id, so the attachment is completed but the message is empty.
            await addFilesToDraft(serverUrl, channelId, '', [fileInfo]);

            const retained = await getDraft(database, channelId, '');
            expect(retained).toBeDefined();
            expect(retained?.files.length).toBe(1);

            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe('upsert');
            expect(outbox?.status).toBe('blocked');
            expect(outbox?.lastErrorCode).toBe('unsyncable_empty');
        });

        it('protects an in-progress upload with waiting_for_upload, then parks it on completion when empty', async () => {
            await addFilesToDraft(serverUrl, channelId, '', [uploadingFile]);

            let outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe('waiting_for_upload');
            expect(outbox?.operation).toBe('upsert');

            await updateDraftFile(serverUrl, channelId, '', completedFile);

            const retained = await getDraft(database, channelId, '');
            expect(retained?.fileIds).toEqual(['srvid1']);

            // Upload finished but the message is still empty, so it cannot POST -> parked.
            outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe('blocked');
            expect(outbox?.lastErrorCode).toBe('unsyncable_empty');
            expect(await countOutbox()).toBe(1);
        });

        it('flips a pending delete back to a reset pending upsert on a genuine edit', async () => {
            await updateDraftMessage(serverUrl, channelId, '', 'hello');
            await removeDraft(serverUrl, channelId);

            const deleteOutbox = await getDraftOutbox(database, channelId, '');
            expect(deleteOutbox?.operation).toBe('delete');

            await updateDraftMessage(serverUrl, channelId, '', 'world');

            const draftAfter = await getDraft(database, channelId, '');
            expect(draftAfter?.message).toBe('world');

            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe('upsert');
            expect(outbox?.status).toBe('pending');
            expect(outbox?.generation).toBe(3);
            expect(outbox?.deletedFingerprint).toBeNull();
            expect(outbox?.keepLocal).toBe(false);
            expect(outbox?.attemptCount).toBe(0);
            expect(await countOutbox()).toBe(1);
        });

        it('does not create an outbox row for device-local markdown image metadata', async () => {
            await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});

            await updateDraftMarkdownImageMetadata({
                serverUrl,
                channelId,
                rootId: '',
                imageMetadata: {image1: {height: 1, width: 1, format: 'png', frame_count: 1}},
            });

            expect(await countOutbox()).toBe(0);
        });
    });

    describe('switchToGlobalDrafts', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should emit navigation event on tablet', async () => {
            jest.mocked(isTablet).mockReturnValue(true);
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            await operator?.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

            await switchToGlobalDrafts(serverUrl);

            expect(emitSpy).toHaveBeenCalledWith(Navigation.NAVIGATION_HOME, Screens.GLOBAL_DRAFTS, {initialTab: undefined});
        });

        it('if prepareRecordsOnly is true, should emit navigation event on tablet for Scheduled post tab and also call batchRecord', async () => {
            jest.mocked(isTablet).mockReturnValue(true);
            if (!operator) {
                expect(operator).toBeDefined();
                return;
            }

            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            const batchRecordSpy = jest.spyOn(operator, 'batchRecords');

            await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

            await switchToGlobalDrafts(serverUrl, '', DRAFT_SCREEN_TAB_SCHEDULED_POSTS, true);

            expect(batchRecordSpy).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalled();
        });

        it('should fail to emit navigation event on tablet', async () => {
            jest.mocked(isTablet).mockReturnValue(true);
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            await switchToGlobalDrafts('nonexistent');

            expect(emitSpy).not.toHaveBeenCalled();
        });

        it('should fail to emit navigation event on tablet if currentTeamId is not set', async () => {
            jest.mocked(isTablet).mockReturnValue(true);
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            await operator?.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: ''}], prepareRecordsOnly: false});

            await switchToGlobalDrafts(serverUrl);

            expect(emitSpy).not.toHaveBeenCalled();
        });

        it('should call dismissAllRoutesAndPopToScreen on non-tablet', async () => {
            jest.mocked(isTablet).mockReturnValue(false);
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            const dismissAllRoutesAndPopToScreenMock = jest.mocked(dismissAllRoutesAndPopToScreen);

            await operator?.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
            await switchToGlobalDrafts(serverUrl);

            expect(dismissAllRoutesAndPopToScreenMock).toHaveBeenCalledWith(Screens.GLOBAL_DRAFTS, {initialTab: undefined});
            expect(emitSpy).not.toHaveBeenCalled();
        });

        it('should not call navigateToScreen on non-tablet when server url is a non existent URL', async () => {
            jest.mocked(isTablet).mockReturnValue(false);
            const dismissAllRoutesAndPopToScreenMock = jest.mocked(dismissAllRoutesAndPopToScreen);
            const waitUntilScreenHasLoadedMock = jest.mocked(NavigationStore.waitUntilScreenHasLoaded);
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            await switchToGlobalDrafts('nonexistent');

            expect(dismissAllRoutesAndPopToScreenMock).not.toHaveBeenCalled();
            expect(waitUntilScreenHasLoadedMock).not.toHaveBeenCalled();
            expect(emitSpy).not.toHaveBeenCalled();
        });

        it('should pass initialTab param when provided and emit event for tablets', async () => {
            jest.mocked(isTablet).mockReturnValue(true);
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            await switchToGlobalDrafts(serverUrl, teamId, DRAFT_SCREEN_TAB_SCHEDULED_POSTS);
            expect(emitSpy).toHaveBeenCalledWith(Navigation.NAVIGATION_HOME, Screens.GLOBAL_DRAFTS, {initialTab: DRAFT_SCREEN_TAB_SCHEDULED_POSTS});

            await switchToGlobalDrafts(serverUrl, teamId, DRAFT_SCREEN_TAB_DRAFTS);
            expect(emitSpy).toHaveBeenCalledWith(Navigation.NAVIGATION_HOME, Screens.GLOBAL_DRAFTS, {initialTab: DRAFT_SCREEN_TAB_DRAFTS});
        });

        it('should pass initialTab param when provided', async () => {
            jest.mocked(isTablet).mockReturnValue(false);
            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
            const dismissAllRoutesAndPopToScreenMock = jest.mocked(dismissAllRoutesAndPopToScreen);

            await switchToGlobalDrafts(serverUrl, teamId, DRAFT_SCREEN_TAB_SCHEDULED_POSTS);
            expect(dismissAllRoutesAndPopToScreenMock).toHaveBeenCalledWith(Screens.GLOBAL_DRAFTS, {initialTab: DRAFT_SCREEN_TAB_SCHEDULED_POSTS});

            await switchToGlobalDrafts(serverUrl, teamId, DRAFT_SCREEN_TAB_DRAFTS);
            expect(dismissAllRoutesAndPopToScreenMock).toHaveBeenCalledWith(Screens.GLOBAL_DRAFTS, {initialTab: DRAFT_SCREEN_TAB_DRAFTS});
            expect(emitSpy).not.toHaveBeenCalled();
        });

        it('should call dismissAllRoutesAndPopToScreen from navigation store if Global draft is already present', async () => {
            jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.GLOBAL_DRAFTS, Screens.CHANNEL, Screens.THREAD]);

            await switchToGlobalDrafts(serverUrl, teamId, DRAFT_SCREEN_TAB_SCHEDULED_POSTS);

            expect(dismissAllRoutesAndPopToScreen).toHaveBeenCalledWith(Screens.GLOBAL_DRAFTS);
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
            await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});
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
});

describe('updateDraftBoRConfig', () => {
    const postBoRConfig: PostBoRConfig = {
        enabled: true,
        borDurationSeconds: 300,
        borMaximumTimeToLiveSeconds: 3600,
    };

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
        database = DatabaseManager.serverDatabases[serverUrl]!.database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const result = await updateDraftBoRConfig('foo', channelId, '', postBoRConfig) as {draft: unknown; error: unknown};
        expect(result.error).toBeTruthy();
    });

    it('handle no draft', async () => {
        const result = await updateDraftBoRConfig(serverUrl, channelId, '', postBoRConfig) as {draft: DraftModel; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
        expect(result.draft.metadata?.borConfig?.enabled).toBe(postBoRConfig.enabled);
        expect(result.draft.metadata?.borConfig?.borDurationSeconds).toBe(postBoRConfig.borDurationSeconds);
        expect(result.draft.type).toBe(PostTypes.BURN_ON_READ);

        // Burn-on-read-only draft with an empty message is unsyncable: parked, never pending.
        const outbox = await getDraftOutbox(database, channelId, '');
        expect(outbox?.status).toBe('blocked');
        expect(outbox?.lastErrorCode).toBe('unsyncable_empty');
    });

    it('update draft BoR config with enabled true', async () => {
        await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});

        const result = await updateDraftBoRConfig(serverUrl, channelId, '', postBoRConfig) as {draft: DraftModel; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
        expect(result.draft.metadata?.borConfig?.enabled).toBe(postBoRConfig.enabled);
        expect(result.draft.metadata?.borConfig?.borDurationSeconds).toBe(postBoRConfig.borDurationSeconds);
        expect(result.draft.type).toBe('burn_on_read');
    });

    it('update draft BoR config with enabled false', async () => {
        await operator?.handleDraft({drafts: [draft], prepareRecordsOnly: false});

        const disabledBoRConfig = {...postBoRConfig, enabled: false};
        const result = await updateDraftBoRConfig(serverUrl, channelId, '', disabledBoRConfig) as {draft: DraftModel; error: unknown};
        expect(result.error).toBeUndefined();
        expect(result.draft).toBeDefined();
        expect(result.draft.metadata?.borConfig?.enabled).toBe(false);
        expect(result.draft.type).toBe('');
    });
});
