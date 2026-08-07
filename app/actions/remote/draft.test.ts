// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {DraftOutboxOperation, DraftOutboxStatus} from '@constants/draft';
import {PostTypes} from '@constants/post';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {buildDraftOutboxId, getDraft, getDraftOutbox} from '@queries/servers/drafts';
import {draftContentFingerprint, normalizeServerDraft} from '@utils/draft/sync';
import * as log from '@utils/log';

import {computeNextAttemptAt, confirmDeleteTombstone, deleteAbsentCleanDraft, fetchDraftsForTeam, getReconcilableKeys, processOutboxDelete, processOutboxUpsert, reconcileTeamDrafts} from './draft';
import {forceLogoutIfNecessary} from './session';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type DraftModel from '@typings/database/models/servers/draft';
import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';

jest.mock('./session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

jest.mock('@managers/websocket_manager', () => ({
    __esModule: true,
    default: {
        getClient: jest.fn(() => ({getConnectionId: () => 'conn-test'})),
    },
}));

const mockedForceLogout = jest.mocked(forceLogoutIfNecessary);

const {SERVER: {DRAFT, DRAFT_OUTBOX}} = MM_TABLES;

// httpError: a minimal ClientError-shaped rejection carrying a status code (and optionally headers)
// for exercising the worker error-classification table.
const httpError = (statusCode: number, headers?: Record<string, string>) => ({
    status_code: statusCode,
    url: `https://${'drafts.remote.test.com'}/api/v4/users/me/drafts`,
    message: 'request failed',
    headers,
});

const serverUrl = 'drafts.remote.test.com';
const teamId = 'teamid1teamid1teamid1teamid1';
const otherTeamId = 'otherteamotherteamotherteam1';
const channelId = 'channelid1channelid1channel1';
const channelId2 = 'channelid2channelid2channel2';
const dmChannelId = 'dmchannel1dmchannel1dmchan01';
const userId = 'userid1userid1userid1userid1';

const mockClient = {
    getDrafts: jest.fn(),
    upsertDraft: jest.fn(),
    deleteDraft: jest.fn(),
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
    teamId?: string;
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

    const seedBoRConfig = async (duration = '30', maxTtl = '300') => {
        await operator.handleConfigs({
            configs: [
                {id: 'BurnOnReadDurationSeconds', value: duration},
                {id: 'BurnOnReadMaximumTimeToLiveSeconds', value: maxTtl},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    };

    const seedOutbox = async (fields: SeedOutbox) => {
        await database.write(async (writer) => {
            const record = database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).prepareCreate((o) => {
                o._raw.id = buildDraftOutboxId(fields.channelId, fields.rootId ?? '');
                o.channelId = fields.channelId;
                o.rootId = fields.rootId ?? '';
                o.teamId = fields.teamId ?? teamId;
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
        mockClient.upsertDraft.mockReset();
        mockClient.deleteDraft.mockReset();
        mockedForceLogout.mockReset();
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

            // DM channel (type D, empty team) WITH a membership row: in scope.
            await seedChannel(dmChannelId, '', 'D');
            await seedMembership(dmChannelId, '');

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

        // --- Fix #1: the GET path must not write to a torn-down database after the HTTP await. ---
        it('writes nothing and returns {error} when shouldAbort() fires after the GET (fix #1)', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'late', update_at: 4000})]);

            // The server was torn down while the GET was in flight: the snapshot write must be skipped.
            const result = await reconcileTeamDrafts(serverUrl, teamId, {shouldAbort: () => true});

            expect(result.error).toBeDefined();
            expect(await getDraft(database, channelId, '')).toBeUndefined();
            expect(await getDraftOutbox(database, channelId, '')).toBeUndefined();
        });

        // --- Fix #6: every observed key is announced via onSnapshot as the GET resolves (the manager
        // uses this to bump the in-flight observation ordinal; the synchronous timing that closes the
        // race is asserted in the manager suite's "bumps the observation ordinal" test). ---
        it('announces every observed key via onSnapshot (fix #6)', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            const onSnapshot = jest.fn();
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'observed', update_at: 4200})]);

            await reconcileTeamDrafts(serverUrl, teamId, {onSnapshot});

            expect(onSnapshot).toHaveBeenCalledTimes(1);
            expect(onSnapshot).toHaveBeenCalledWith([{channelId, rootId: ''}]);
        });

        // --- Fix #9: tightened, authoritative per-draft scope + non-PII missing-channel handling. ---
        describe('scope (fix #9)', () => {
            it('skips a DM/GM channel draft when the user has no confirmed membership', async () => {
                // DM channel present but NO membership row -> not authoritative.
                await seedChannel(dmChannelId, '', 'D');
                mockClient.getDrafts.mockResolvedValueOnce([serverDraft({channel_id: dmChannelId, message: 'dm', update_at: 100})]);

                const result = await reconcileTeamDrafts(serverUrl, teamId);

                expect(result.applied).toBe(0);
                expect(result.drafts?.length).toBe(0);
                expect(await getDraft(database, dmChannelId, '')).toBeUndefined();
            });

            it('skips a non-DM/GM draft whose channel belongs to a different team even with membership', async () => {
                // Member of the channel, but the channel is scoped to another team than the one reconciled.
                await seedChannel(channelId, otherTeamId, 'O');
                await seedMembership(channelId, otherTeamId);
                mockClient.getDrafts.mockResolvedValueOnce([serverDraft({channel_id: channelId, message: 'x', update_at: 100})]);

                const result = await reconcileTeamDrafts(serverUrl, teamId);

                expect(result.applied).toBe(0);
                expect(result.drafts?.length).toBe(0);
                expect(await getDraft(database, channelId, '')).toBeUndefined();
            });

            it('applies a non-DM/GM draft only with membership AND a matching channel team', async () => {
                await seedChannel(channelId, teamId, 'O');
                await seedMembership(channelId, teamId);
                mockClient.getDrafts.mockResolvedValueOnce([serverDraft({channel_id: channelId, message: 'ok', update_at: 100})]);

                const result = await reconcileTeamDrafts(serverUrl, teamId);

                expect(result.applied).toBe(1);
                expect(result.drafts?.length).toBe(1);
                expect((await getDraft(database, channelId, ''))?.message).toBe('ok');
            });

            it('skips a draft for a missing channel, sets missingDeps, and never logs a channel id', async () => {
                await seedChannel(channelId, teamId, 'O');
                await seedMembership(channelId, teamId);
                const logSpy = jest.spyOn(log, 'logDebug');

                const missingChannelId = 'missingchan00missingchan0000';
                mockClient.getDrafts.mockResolvedValueOnce([
                    serverDraft({channel_id: channelId, message: 'ok', update_at: 100}),
                    serverDraft({channel_id: missingChannelId, message: 'orphan', update_at: 200}),
                ]);

                const result = await reconcileTeamDrafts(serverUrl, teamId);

                // The present-channel draft applies; the missing-channel draft is skipped but signals a retry.
                expect(result.applied).toBe(1);
                expect(result.missingDeps).toBe(true);
                expect(await getDraft(database, missingChannelId, '')).toBeUndefined();

                // No log call may carry the (PII) channel id — only a count is logged.
                for (const call of logSpy.mock.calls) {
                    expect(call).not.toContain(missingChannelId);
                }
            });

            it('does not set missingDeps when every channel is present', async () => {
                await seedChannel(channelId, teamId, 'O');
                await seedMembership(channelId, teamId);
                mockClient.getDrafts.mockResolvedValueOnce([serverDraft({channel_id: channelId, message: 'ok', update_at: 100})]);

                const result = await reconcileTeamDrafts(serverUrl, teamId);

                expect(result.missingDeps).toBe(false);
            });
        });

        // --- Fix #10: burn-on-read <-> normal transitions keep type and borConfig consistent. ---
        describe('burn-on-read reconciliation (fix #10)', () => {
            const images = {'http://img.test/a.png': {height: 10, width: 10}} as PostMetadata['images'];

            it('drops a stale enabled borConfig when a clean BoR draft becomes normal on the server', async () => {
                await seedChannel(channelId, teamId, 'O');
                await seedMembership(channelId, teamId);
                await seedDraft({
                    channelId,
                    message: 'hi',
                    type: PostTypes.BURN_ON_READ as PostTypesUserCreatable,
                    metadata: {images, borConfig: {enabled: true, borDurationSeconds: 30, borMaximumTimeToLiveSeconds: 300}},
                    serverUpdateAt: 1000,
                });

                // Server now reports a normal (type '') draft.
                mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'hi', update_at: 3000})]);

                const result = await reconcileTeamDrafts(serverUrl, teamId);

                expect(result.applied).toBe(1);
                const draft = await getDraft(database, channelId, '');
                expect(draft?.type).toBe('');
                expect(draft?.metadata?.borConfig).toBeUndefined();

                // Device-local images survive the update.
                expect(draft?.metadata?.images).toEqual(images);
            });

            it('reconstructs borConfig when a normal draft becomes BoR with valid server durations', async () => {
                await seedChannel(channelId, teamId, 'O');
                await seedMembership(channelId, teamId);
                await seedBoRConfig('30', '300');
                await seedDraft({channelId, message: 'hi', type: '', metadata: {images}, serverUpdateAt: 1000});

                mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'hi', type: PostTypes.BURN_ON_READ as PostType, update_at: 3000})]);

                const result = await reconcileTeamDrafts(serverUrl, teamId);

                expect(result.applied).toBe(1);
                const draft = await getDraft(database, channelId, '');
                expect(draft?.type).toBe(PostTypes.BURN_ON_READ);
                expect(draft?.metadata?.borConfig).toEqual({enabled: true, borDurationSeconds: 30, borMaximumTimeToLiveSeconds: 300});
                expect(draft?.metadata?.images).toEqual(images);
            });

            it('fails closed (BoR type, no borConfig) when the server BoR draft has no valid durations', async () => {
                await seedChannel(channelId, teamId, 'O');
                await seedMembership(channelId, teamId);

                // No BoR durations config seeded -> reconstruction must not fabricate one.
                await seedDraft({channelId, message: 'hi', type: '', metadata: {images}, serverUpdateAt: 1000});
                mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'hi', type: PostTypes.BURN_ON_READ as PostType, update_at: 3000})]);

                const result = await reconcileTeamDrafts(serverUrl, teamId);

                expect(result.applied).toBe(1);
                const draft = await getDraft(database, channelId, '');
                expect(draft?.type).toBe(PostTypes.BURN_ON_READ);
                expect(draft?.metadata?.borConfig).toBeUndefined();
                expect(draft?.metadata?.images).toEqual(images);
            });
        });

        // --- Fix #4: a confirming-delete tombstone that matches the reappearing server content retries. ---
        it('resets a ConfirmingDelete tombstone to Pending when the server fingerprint still matches (fix #4)', async () => {
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
            await seedOutbox({channelId, operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.ConfirmingDelete, deletedFingerprint: fp});
            mockClient.getDrafts.mockResolvedValueOnce([sdApi]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);

            // The delete did NOT take (content still present) -> retry it: reset to Pending, retry state cleared.
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe(DraftOutboxOperation.Delete);
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
            expect(outbox?.attemptCount).toBe(0);
            expect(outbox?.nextAttemptAt).toBe(0);
            expect(await getDraft(database, channelId, '')).toBeUndefined();
        });

        // --- Fix #5: a keep_local delete whose fingerprint differs parks without disturbing the local draft. ---
        it('parks a keep_local delete as unsyncable_empty on a differing fingerprint without touching the local draft (fix #5)', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);

            // Retained empty/attachment-only local draft behind a keepLocal delete tombstone.
            await seedDraft({channelId, message: '', fileIds: ['f1'], files: [{id: 'f1', clientId: 'c1'} as FileInfo], serverUpdateAt: 0});
            await seedOutbox({channelId, operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending, keepLocal: true, deletedFingerprint: 'staleotherfingerprintstale00'});

            // Another client wrote genuinely new content after our delete.
            mockClient.getDrafts.mockResolvedValueOnce([serverDraft({message: 'reappeared', update_at: 8500})]);

            const result = await reconcileTeamDrafts(serverUrl, teamId);

            expect(result.applied).toBe(1);

            // The retained local draft is NEITHER resurrected with remote text NOR destroyed.
            const draft = await getDraft(database, channelId, '');
            expect(draft?.message).toBe('');
            expect(draft?.fileIds).toEqual(['f1']);

            // The delete is abandoned by parking the outbox as an unsyncable-empty upsert.
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe(DraftOutboxOperation.Upsert);
            expect(outbox?.status).toBe(DraftOutboxStatus.Blocked);
            expect(outbox?.lastErrorCode).toBe('unsyncable_empty');
            expect(outbox?.keepLocal).toBe(false);
        });
    });

    describe('getReconcilableKeys', () => {
        it('classifies clean drafts, dirty drafts, and in-scope tombstones with correct flags; excludes out-of-scope tombstones', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedChannel(dmChannelId, '', 'D'); // DM: authoritative even without a membership row.

            // Clean server-backed draft (Rule A eligible).
            await seedDraft({channelId, rootId: '', message: 'clean', serverUpdateAt: 1000});

            // Pending-upsert draft (non-eligible: it has local intent).
            const dirtyRoot = 'dirtyrootdirtyrootdirtyroot1';
            await seedDraft({channelId, rootId: dirtyRoot, message: 'dirty', serverUpdateAt: 0});
            await seedOutbox({channelId, rootId: dirtyRoot, operation: DraftOutboxOperation.Upsert, status: DraftOutboxStatus.Pending});

            // keepLocal delete tombstone on a DM (team '') -> in scope via the DM/GM membership rule.
            await seedOutbox({channelId: dmChannelId, rootId: '', operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending, keepLocal: true, teamId: ''});

            // Out-of-scope tombstone: stored under a different team on a non-DM/GM channel.
            await seedChannel(channelId2, otherTeamId, 'O');
            await seedOutbox({channelId: channelId2, rootId: '', operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending, teamId: otherTeamId});

            const keys = await getReconcilableKeys(database, teamId);

            const clean = keys.find((k) => k.channelId === channelId && k.rootId === '' && k.kind === 'draft');
            expect(clean).toMatchObject({serverUpdateAt: 1000, hasOutbox: false, authoritative: true});

            const dirty = keys.find((k) => k.channelId === channelId && k.rootId === dirtyRoot && k.kind === 'draft');
            expect(dirty).toMatchObject({hasOutbox: true, outboxOperation: DraftOutboxOperation.Upsert, authoritative: true});

            const tombstone = keys.find((k) => k.channelId === dmChannelId && k.kind === 'tombstone');
            expect(tombstone).toMatchObject({keepLocal: true, outboxOperation: DraftOutboxOperation.Delete, authoritative: true});

            // The out-of-scope tombstone must be excluded entirely.
            expect(keys.some((k) => k.channelId === channelId2)).toBe(false);
            expect(keys.length).toBe(3);
        });

        it('dedups a draft+tombstone key to a single tombstone and flags membership-lost channels non-authoritative', async () => {
            // In-team channel WITHOUT a membership row -> not authoritative.
            await seedChannel(channelId, teamId, 'O');

            // A keepLocal=true delete retains a Draft AND a tombstone under the same key.
            await seedDraft({channelId, rootId: '', message: 'kept', serverUpdateAt: 2000});
            await seedOutbox({channelId, rootId: '', operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending, keepLocal: true});

            const keys = await getReconcilableKeys(database, teamId);

            const forKey = keys.filter((k) => k.channelId === channelId && k.rootId === '');
            expect(forKey.length).toBe(1);
            expect(forKey[0].kind).toBe('tombstone');
            expect(forKey[0].authoritative).toBe(false);
        });
    });

    describe('deleteAbsentCleanDraft', () => {
        it('destroys a still-clean server-backed draft', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedDraft({channelId, rootId: '', message: 'clean', serverUpdateAt: 3000});

            await deleteAbsentCleanDraft(serverUrl, channelId, '');

            expect(await getDraft(database, channelId, '')).toBeUndefined();
        });

        it('no-ops when the draft gained an outbox (dirtied) since the decision', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedDraft({channelId, rootId: '', message: 'clean', serverUpdateAt: 3000});
            await seedOutbox({channelId, rootId: '', operation: DraftOutboxOperation.Upsert, status: DraftOutboxStatus.Pending});

            await deleteAbsentCleanDraft(serverUrl, channelId, '');

            expect(await getDraft(database, channelId, '')).toBeDefined();
        });
    });

    describe('confirmDeleteTombstone', () => {
        it('removes the outbox row for an ordinary (keepLocal=false) delete', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedOutbox({channelId, rootId: '', operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending, keepLocal: false});

            await confirmDeleteTombstone(serverUrl, channelId, '');

            expect(await getDraftOutbox(database, channelId, '')).toBeUndefined();
        });

        it('parks unsyncable_empty and clears serverUpdateAt for a keepLocal=true delete', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedDraft({channelId, rootId: '', message: 'kept', serverUpdateAt: 4000});
            await seedOutbox({channelId, rootId: '', operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending, keepLocal: true, deletedFingerprint: 'fp'});

            await confirmDeleteTombstone(serverUrl, channelId, '');

            const draft = await getDraft(database, channelId, '');
            expect(draft?.serverUpdateAt).toBe(0);

            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe(DraftOutboxOperation.Upsert);
            expect(outbox?.status).toBe(DraftOutboxStatus.Blocked);
            expect(outbox?.lastErrorCode).toBe('unsyncable_empty');
            expect(outbox?.keepLocal).toBe(false);
            expect(outbox?.deletedFingerprint).toBeNull();
        });

        it('no-ops when the tombstone flipped to a genuine upsert since the decision', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedDraft({channelId, rootId: '', message: 'edited', serverUpdateAt: 0});
            await seedOutbox({channelId, rootId: '', operation: DraftOutboxOperation.Upsert, status: DraftOutboxStatus.Pending});

            await confirmDeleteTombstone(serverUrl, channelId, '');

            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe(DraftOutboxOperation.Upsert);
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
        });
    });

    describe('computeNextAttemptAt', () => {
        it('honors a Retry-After (retryAfterMs) verbatim, ignoring backoff', () => {
            expect(computeNextAttemptAt(0, 1000, 5000)).toBe(6000);
            expect(computeNextAttemptAt(9, 1000, 250)).toBe(1250);
        });

        it('grows exponentially from the base and caps at DRAFT_SYNC_RETRY_MAX_MS', () => {
            // Neutralize jitter (0.5 -> (0.5*2 - 1) === 0) for exact backoff assertions.
            const rand = jest.spyOn(Math, 'random').mockReturnValue(0.5);

            expect(computeNextAttemptAt(0, 0)).toBe(1000);
            expect(computeNextAttemptAt(3, 0)).toBe(8000);

            // 1000 * 2^100 is astronomically large -> ceilinged at the max.
            expect(computeNextAttemptAt(100, 0)).toBe(300000);

            rand.mockRestore();
        });

        it('stays within the jitter band and is never negative', () => {
            const low = jest.spyOn(Math, 'random').mockReturnValue(0);

            // Fully negative jitter: base 1000 - 20% = 800, still >= 0.
            expect(computeNextAttemptAt(0, 0)).toBe(800);
            low.mockRestore();

            const high = jest.spyOn(Math, 'random').mockReturnValue(1);

            // Fully positive jitter: base 1000 + 20% = 1200.
            expect(computeNextAttemptAt(0, 0)).toBe(1200);
            high.mockRestore();
        });
    });

    describe('processOutboxUpsert', () => {
        const seedUpsertReady = async (over: Partial<SeedDraft> = {}) => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedDraft({channelId, message: 'hello', serverUpdateAt: 0, ...over});
            await seedOutbox({channelId, operation: DraftOutboxOperation.Upsert, status: DraftOutboxStatus.Pending});
        };

        it('POSTs and removes the outbox on success, stamping serverUpdateAt from the response', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockResolvedValueOnce(serverDraft({message: 'hello', update_at: 4242}));

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'done'});
            expect(mockClient.upsertDraft).toHaveBeenCalledTimes(1);
            expect(mockClient.upsertDraft.mock.calls[0][1]).toBe('conn-test');
            expect(await getDraftOutbox(database, channelId, '')).toBeUndefined();
            expect((await getDraft(database, channelId, ''))?.serverUpdateAt).toBe(4242);
        });

        it('does not clear the outbox or overwrite content when the generation changed during the POST', async () => {
            await seedUpsertReady();

            // Simulate a newer local edit landing while the POST is in flight: bump the generation.
            mockClient.upsertDraft.mockImplementationOnce(async () => {
                await database.write(async (writer) => {
                    const o = await getDraftOutbox(database, channelId, '');
                    await writer.batch(o!.prepareUpdate((x) => {
                        x.generation = 9;
                    }));
                });
                return serverDraft({message: 'hello', update_at: 5555});
            });

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'retry'});

            // The newer outbox row survives (still pending) and only serverUpdateAt is advanced.
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
            expect(outbox?.generation).toBe(9);
            expect((await getDraft(database, channelId, ''))?.serverUpdateAt).toBe(5555);
        });

        it('blocks with missing_local_draft and never POSTs when no Draft exists', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedOutbox({channelId, operation: DraftOutboxOperation.Upsert, status: DraftOutboxStatus.Pending});

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'blocked'});
            expect(mockClient.upsertDraft).not.toHaveBeenCalled();
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Blocked);
            expect(outbox?.lastErrorCode).toBe('missing_local_draft');
        });

        it('converts an empty-message draft with an attachment into a keepLocal delete without POSTing', async () => {
            await seedUpsertReady({message: '', files: [{id: 'f1', clientId: 'c1'} as FileInfo], fileIds: ['f1']});

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'converted'});
            expect(mockClient.upsertDraft).not.toHaveBeenCalled();
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe(DraftOutboxOperation.Delete);
            expect(outbox?.keepLocal).toBe(true);
            expect(outbox?.deletedFingerprint).toBeTruthy();
        });

        it('keeps the row as waiting_for_upload when an in-progress upload (file without id) remains', async () => {
            await seedUpsertReady({files: [{clientId: 'c1', localPath: 'p'} as FileInfo]});
            mockClient.upsertDraft.mockResolvedValueOnce(serverDraft({message: 'hello', update_at: 7000}));

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'done'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.WaitingForUpload);
        });

        it('forces logout and leaves the row pending on 401', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockRejectedValueOnce(httpError(401));

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'retry'});
            expect(mockedForceLogout).toHaveBeenCalledTimes(1);
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
            expect(outbox?.lastErrorCode).toBeNull();
        });

        it('blocks with forbidden on 403', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockRejectedValueOnce(httpError(403));

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'blocked'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Blocked);
            expect(outbox?.lastErrorCode).toBe('forbidden');
        });

        it('blocks with invalid on 400', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockRejectedValueOnce(httpError(400));

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'blocked'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.lastErrorCode).toBe('invalid');
        });

        it('suspends with sync_disabled on 501', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockRejectedValueOnce(httpError(501));

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'suspend'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Blocked);
            expect(outbox?.lastErrorCode).toBe('sync_disabled');
        });

        it('keeps the row pending with a future nextAttemptAt honoring Retry-After on 429', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockRejectedValueOnce(httpError(429, {'Retry-After': '2'}));

            const before = Date.now();
            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'retry', retryAfterMs: 2000});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
            expect(outbox?.attemptCount).toBe(1);
            expect(outbox?.nextAttemptAt).toBeGreaterThanOrEqual(before + 2000);
        });

        it('keeps the row pending and backs off with an incremented attemptCount on a 500/network error', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockRejectedValueOnce(httpError(500));

            const before = Date.now();
            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'retry'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
            expect(outbox?.attemptCount).toBe(1);
            expect(outbox?.nextAttemptAt).toBeGreaterThan(before);
        });

        it('is a no-op for a non-pending / non-upsert outbox row', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedDraft({channelId, message: 'hello', serverUpdateAt: 0});
            await seedOutbox({channelId, operation: DraftOutboxOperation.Upsert, status: DraftOutboxStatus.Blocked});

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'done'});
            expect(mockClient.upsertDraft).not.toHaveBeenCalled();
        });

        it('aborts the ack write when shouldAbort becomes true after the POST resolves (fix #1)', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockResolvedValueOnce(serverDraft({message: 'hello', update_at: 4242}));

            const result = await processOutboxUpsert(serverUrl, channelId, '', {shouldAbort: () => true});

            // The row is left untouched: no ack, still pending, serverUpdateAt unchanged.
            expect(result).toEqual({outcome: 'done'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
            expect((await getDraft(database, channelId, ''))?.serverUpdateAt).toBe(0);
        });

        it('aborts the ack write when the captured database is recreated during the POST (fix #1)', async () => {
            await seedUpsertReady();
            const originalDb = DatabaseManager.serverDatabases[serverUrl]!.database;
            mockClient.upsertDraft.mockImplementationOnce(async () => {
                // A logout/wipe recreates the server DB while the POST is in flight.
                DatabaseManager.serverDatabases[serverUrl]!.database = {} as Database;
                return serverDraft({message: 'hello', update_at: 4242});
            });

            const result = await processOutboxUpsert(serverUrl, channelId, '');

            // Restore the real DB before asserting and cleaning up.
            DatabaseManager.serverDatabases[serverUrl]!.database = originalDb;

            expect(result).toEqual({outcome: 'done'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
            expect((await getDraft(database, channelId, ''))?.serverUpdateAt).toBe(0);
        });

        it('does not clear the outbox when the observation ordinal changed during the POST (fix #6 fence)', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockResolvedValueOnce(serverDraft({message: 'hello', update_at: 8888}));

            const result = await processOutboxUpsert(serverUrl, channelId, '', {
                captureObservation: () => 1,
                observationChanged: () => true, // a reconcile GET observed newer content mid-POST
            });

            // Treated like a generation mismatch: outbox retained (pending), only serverUpdateAt advances.
            expect(result).toEqual({outcome: 'retry'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
            expect((await getDraft(database, channelId, ''))?.serverUpdateAt).toBe(8888);
        });

        it('clears the outbox normally when the observation ordinal is unchanged (fix #6 fence)', async () => {
            await seedUpsertReady();
            mockClient.upsertDraft.mockResolvedValueOnce(serverDraft({message: 'hello', update_at: 9999}));

            const result = await processOutboxUpsert(serverUrl, channelId, '', {
                captureObservation: () => 3,
                observationChanged: () => false,
            });

            expect(result).toEqual({outcome: 'done'});
            expect(await getDraftOutbox(database, channelId, '')).toBeUndefined();
        });
    });

    describe('processOutboxDelete', () => {
        const seedDeleteReady = async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedOutbox({channelId, operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending, deletedFingerprint: 'fp'});
        };

        it('hands off to confirming_delete on success while retaining the tombstone', async () => {
            await seedDeleteReady();
            mockClient.deleteDraft.mockResolvedValueOnce(serverDraft());

            const result = await processOutboxDelete(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'done'});
            expect(mockClient.deleteDraft).toHaveBeenCalledWith(channelId, '', 'conn-test');
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe(DraftOutboxOperation.Delete);
            expect(outbox?.status).toBe(DraftOutboxStatus.ConfirmingDelete);
            expect(outbox?.deletedFingerprint).toBe('fp');
        });

        it('blocks with unsupported_route and suspends on a 404 (a 404 is NOT success)', async () => {
            await seedDeleteReady();
            mockClient.deleteDraft.mockRejectedValueOnce(httpError(404));

            const result = await processOutboxDelete(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'suspend'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Blocked);
            expect(outbox?.lastErrorCode).toBe('unsupported_route');
        });

        it('blocks with scope_unverifiable and never DELETEs when channel membership is lost', async () => {
            // Non-DM/GM channel with NO membership row -> authority cannot be verified.
            await seedChannel(channelId, teamId, 'O');
            await seedOutbox({channelId, operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.Pending});

            const result = await processOutboxDelete(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'blocked'});
            expect(mockClient.deleteDraft).not.toHaveBeenCalled();
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.status).toBe(DraftOutboxStatus.Blocked);
            expect(outbox?.lastErrorCode).toBe('scope_unverifiable');
        });

        it('is a no-op for a non-pending delete row', async () => {
            await seedChannel(channelId, teamId, 'O');
            await seedMembership(channelId, teamId);
            await seedOutbox({channelId, operation: DraftOutboxOperation.Delete, status: DraftOutboxStatus.ConfirmingDelete});

            const result = await processOutboxDelete(serverUrl, channelId, '');

            expect(result).toEqual({outcome: 'done'});
            expect(mockClient.deleteDraft).not.toHaveBeenCalled();
        });

        it('does not transition to confirming_delete when shouldAbort is true after the DELETE (fix #1)', async () => {
            await seedDeleteReady();
            mockClient.deleteDraft.mockResolvedValueOnce(serverDraft());

            const result = await processOutboxDelete(serverUrl, channelId, '', {shouldAbort: () => true});

            // The row is left untouched: still a Pending delete, no confirming transition written.
            expect(result).toEqual({outcome: 'done'});
            const outbox = await getDraftOutbox(database, channelId, '');
            expect(outbox?.operation).toBe(DraftOutboxOperation.Delete);
            expect(outbox?.status).toBe(DraftOutboxStatus.Pending);
        });
    });
});
