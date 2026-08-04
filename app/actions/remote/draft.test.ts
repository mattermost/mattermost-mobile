// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {DraftOutboxOperation, DraftOutboxStatus} from '@constants/draft';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {buildDraftOutboxId, getDraft, getDraftOutbox} from '@queries/servers/drafts';
import {draftContentFingerprint, normalizeServerDraft} from '@utils/draft/sync';

import {fetchDraftsForTeam, reconcileTeamDrafts} from './draft';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type DraftModel from '@typings/database/models/servers/draft';
import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';

const {SERVER: {DRAFT, DRAFT_OUTBOX}} = MM_TABLES;

const serverUrl = 'drafts.remote.test.com';
const teamId = 'teamid1teamid1teamid1teamid1';
const channelId = 'channelid1channelid1channel1';
const dmChannelId = 'dmchannel1dmchannel1dmchan01';
const userId = 'userid1userid1userid1userid1';

const mockClient = {
    getDrafts: jest.fn(),
};

type SeedDraft = {
    channelId: string;
    rootId?: string;
    message?: string;
    type?: PostTypesUserCreatable | null;
    props?: DraftProps | null;
    fileIds?: string[];
    files?: FileInfo[];
    metadata?: PostMetadata;
    serverUpdateAt?: number | null;
    updateAt?: number;
};

type SeedOutbox = {
    channelId: string;
    rootId?: string;
    operation: typeof DraftOutboxOperation[keyof typeof DraftOutboxOperation];
    status: typeof DraftOutboxStatus[keyof typeof DraftOutboxStatus];
    deletedFingerprint?: string | null;
    lastErrorCode?: string | null;
    keepLocal?: boolean;
};

const serverDraft = (over: Partial<DraftApi> = {}): DraftApi => ({
    create_at: 1000,
    update_at: 2000,
    delete_at: 0,
    user_id: userId,
    channel_id: channelId,
    root_id: '',
    message: 'server message',
    type: '' as PostType,
    props: {},
    file_ids: [],
    ...over,
});

describe('app/actions/remote/draft', () => {
    let database: Database;
    let operator: ServerDataOperator;

    const seedChannel = async (id: string, tId: string, type: ChannelType) => {
        await operator.handleChannel({
            channels: [{id, team_id: tId, type, display_name: 'channel', total_msg_count: 0} as Channel],
            prepareRecordsOnly: false,
        });
    };

    const seedMembership = async (id: string, tId: string) => {
        await operator.handleMyChannel({
            channels: [{id, team_id: tId, total_msg_count: 0} as Channel],
            myChannels: [{id, channel_id: id, user_id: userId, msg_count: 0} as ChannelMembership],
            prepareRecordsOnly: false,
        });
    };

    const seedDraft = async (fields: SeedDraft) => {
        await database.write(async (writer) => {
            const record = database.collections.get<DraftModel>(DRAFT).prepareCreate((d) => {
                d.channelId = fields.channelId;
                d.rootId = fields.rootId ?? '';
                d.message = fields.message ?? '';
                d.type = fields.type ?? '';
                d.props = fields.props ?? {};
                d.fileIds = fields.fileIds ?? [];
                d.files = fields.files ?? [];
                d.metadata = fields.metadata;
                d.serverUpdateAt = fields.serverUpdateAt ?? null;
                d.updateAt = fields.updateAt ?? 1;
            });
            await writer.batch(record);
        });
    };

    const seedOutbox = async (fields: SeedOutbox) => {
        await database.write(async (writer) => {
            const record = database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).prepareCreate((o) => {
                o._raw.id = buildDraftOutboxId(fields.channelId, fields.rootId ?? '');
                o.channelId = fields.channelId;
                o.rootId = fields.rootId ?? '';
                o.teamId = teamId;
                o.operation = fields.operation;
                o.status = fields.status;
                o.generation = 1;
                o.attemptCount = 0;
                o.nextAttemptAt = 0;
                o.keepLocal = fields.keepLocal ?? false;
                o.lastErrorCode = fields.lastErrorCode ?? null;
                o.deletedFingerprint = fields.deletedFingerprint ?? null;
            });
            await writer.batch(record);
        });
    };

    beforeAll(() => {
        // @ts-expect-error mock client only implements the methods used here
        NetworkManager.getClient = () => mockClient;
    });

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.serverDatabases[serverUrl]!.database;
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        mockClient.getDrafts.mockReset();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('fetchDraftsForTeam', () => {
        it('returns the server drafts on success', async () => {
            const drafts = [serverDraft()];
            mockClient.getDrafts.mockResolvedValueOnce(drafts);

            const result = await fetchDraftsForTeam(serverUrl, teamId);

            expect(result.error).toBeUndefined();
            expect(result.drafts).toEqual(drafts);
            expect(mockClient.getDrafts).toHaveBeenCalledWith(teamId, undefined);
        });

        it('returns {error} and no drafts when the client rejects', async () => {
            mockClient.getDrafts.mockRejectedValueOnce(new Error('network'));

            const result = await fetchDraftsForTeam(serverUrl, teamId);

            expect(result.drafts).toBeUndefined();
            expect(result.error).toBeDefined();
        });
    });

    describe('reconcileTeamDrafts', () => {
        it('creates a local draft for a server-only draft (serverUpdateAt set, no outbox)', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'hello', update_at: 2500})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.error).toBeUndefined();
            expect(result.applied).toBe(1);
            expect(result.drafts?.length).toBe(1);

            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('hello');
            expect(draft?.serverUpdateAt).toBe(2500);
            expect(draft?.updateAt).toBeGreaterThan(0);

            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox).toBeUndefined();
        });

        it('replaces a clean existing draft when server content differs', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedDraft({channelId, message: 'old', serverUpdateAt: 1000});
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'new', update_at: 3000})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);
            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('new');
            expect(draft?.serverUpdateAt).toBe(3000);
        });

        it('does not write when a clean existing draft equals the server content (idempotent)', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedDraft({channelId, message: 'same', serverUpdateAt: 1000});
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'same', update_at: 5000})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(0);
            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('same');

            // No write: the previously-observed serverUpdateAt is left untouched.
            expect(draft?.serverUpdateAt).toBe(1000);
        });

        it('applies a differing payload even when server update_at equals the local observation', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedDraft({channelId, message: 'a', serverUpdateAt: 2000});
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'b', update_at: 2000})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);
            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('b');
            expect(draft?.serverUpdateAt).toBe(2000);
        });

        it('preserves local pending-upsert content and merges only server props', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            const localPriority = {priority: 'urgent'} as PostPriority;
            await seedDraft({
                channelId,
                message: 'local',
                fileIds: ['f1'],
                files: [{id: 'f1', clientId: 'c1'} as FileInfo],
                props: {a: 1},
                metadata: {priority: localPriority},
                serverUpdateAt: 0,
                updateAt: 50,
            });
            await seedOutbox({channelId, operation: DraftOutboxOperation.Upsert, status: DraftOutboxStatus.Pending});
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({
                message: 'server',
                props: {b: 2},
                file_ids: ['f2'],
                priority: {priority: 'important'} as PostPriority,
                update_at: 4000,
            })]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);
            const draft = await getDraft(database, channelId, '');

            // Local intent wins for portable content.
            expect(draft?.message).toBe('local');
            expect(draft?.fileIds).toEqual(['f1']);
            expect(draft?.metadata?.priority).toEqual(localPriority);
            expect(draft?.updateAt).toBe(50);

            // Server-owned passthrough props are merged; the observation is recorded.
            expect(draft?.props).toEqual({b: 2});
            expect(draft?.serverUpdateAt).toBe(4000);
        });

        it('applies remote portable fields for waiting_for_upload but preserves local files', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            const localFile = {id: 'old1', clientId: 'c1', localPath: 'path'} as FileInfo;
            await seedDraft({
                channelId,
                message: 'old',
                fileIds: ['old1'],
                files: [localFile],
                serverUpdateAt: 0,
                updateAt: 50,
            });
            await seedOutbox({channelId, operation: DraftOutboxOperation.Upsert, status: DraftOutboxStatus.WaitingForUpload});
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'new', file_ids: ['new1'], update_at: 6000})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);
            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('new');
            expect(draft?.fileIds).toEqual(['new1']);
            expect(draft?.serverUpdateAt).toBe(6000);

            // In-progress upload state must survive.
            expect(draft?.files).toEqual([localFile]);
        });

        it('leaves a blocked (unsyncable_empty) draft untouched', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedDraft({channelId, message: '', metadata: {priority: {priority: 'urgent'} as PostPriority}, serverUpdateAt: 0});
            await seedOutbox({channelId, operation: DraftOutboxOperation.Upsert, status: DraftOutboxStatus.Blocked, lastErrorCode: 'unsyncable_empty'});
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'server', update_at: 7000})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(0);
            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('');
            expect(draft?.serverUpdateAt).toBe(0);
        });

        it('preserves a pending DELETE when the server fingerprint matches (stale echo)', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            const sdApi = serverDraft({message: 'deleted content', update_at: 8000});
            const normalized = normalizeServerDraft(sdApi);
            const fp = draftContentFingerprint({
                message: normalized.message,
                type: normalized.type,
                props: normalized.props,
                fileIds: normalized.fileIds,
                priority: normalized.metadata?.priority,
            });
            await seedOutbox({channelId, operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending, deletedFingerprint: fp});
            mockClient.getDrafts.mockResolvedValueOnce([sdApi]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(0);

            // The draft is NOT recreated and the DELETE intent is retained.
            const draft = await getDraft(database, channelId, '');
            expect(draft).toBeUndefined();
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe(DraftOutboxOperation.Delete);
        });

        it('abandons a pending DELETE and adopts server content when the fingerprint differs', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedOutbox({channelId, operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending, deletedFingerprint: 'staleotherfingerprint'});
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'reappeared', update_at: 8500})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);

            // DELETE intent removed, server content adopted as a clean draft.
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox).toBeUndefined();
            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('reappeared');
            expect(draft?.serverUpdateAt).toBe(8500);
        });

        it('adopts a legacy draft first, then local intent wins over the snapshot', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);

            // Legacy: serverUpdateAt null and NO outbox row.
            await seedDraft({channelId, message: 'legacylocal', serverUpdateAt: null, updateAt: 20});
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'serverlegacy', props: {x: 1}, update_at: 9000})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);

            // Adopted to a pending upsert, so local content wins; only props merge from the server.
            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('legacylocal');
            expect(draft?.props).toEqual({x: 1});
            expect(draft?.serverUpdateAt).toBe(9000);

            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe(DraftOutboxOperation.Upsert);
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
        });

        it('skips a non-member non-DM/GM channel but applies a DM/GM channel draft', async () => {
            // In-team channel with NO membership: out of scope.
            await seedChannel(channelId, teamId, 'O');

            // DM channel (type D, empty team): always in scope.
            await seedChannel(dmChannelId, '', 'D');

            mockClient.getDrafts.mockResolvedValueOnce([
                serverDraft({channel_id: channelId, message: 'private', update_at: 100}),
                serverDraft({channel_id: dmChannelId, message: 'dm', update_at: 200}),
            ]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);
            expect(result.drafts?.length).toBe(1);

            expect(await getDraft(database, channelId, '')).toBeUndefined();
            const dmDraft = await getDraft(database, dmChannelId, '');
            expect(dmDraft?.message).toBe('dm');
        });

        it('persists a reply draft even when its root post is not cached', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            const rootId = 'uncachedrootpostuncachedroot';
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({root_id: rootId, message: 'reply', update_at: 10000})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);
            const draft = await getDraft(database, channelId, rootId);
            expect(draft?.message).toBe('reply');
            expect(draft?.rootId).toBe(rootId);
        });

        it('applies and deletes nothing when the drafts fetch fails', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);

            // Already-synced local draft: adoptLegacyDrafts leaves it alone, so nothing should change.
            await seedDraft({channelId, message: 'untouched', serverUpdateAt: 5000});
            mockClient.getDrafts.mockRejectedValueOnce(new Error('network'));

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.error).toBeDefined();
            expect(result.applied).toBeUndefined();

            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('untouched');
            expect(draft?.serverUpdateAt).toBe(5000);
            expect(await getDraftOutbox(database, channelId, '')).toBeUndefined();
        });

        it('returns {error} when the server database is missing', async () => {
            const result = await reconcileTeamDrafts('nonexistent.server', teamId);
            expect(result.error).toBeDefined();
        });
    });
});
