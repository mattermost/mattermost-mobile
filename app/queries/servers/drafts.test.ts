// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import ServerDatabaseMigrations from '@database/migration/server';

import {
    buildDraftOutboxId,
    getDraft,
    getDraftOutbox,
    mutateDraftAndOutbox,
    repairDuplicateDrafts,
    type PrepareDraftAndOutbox,
} from './drafts';

import type DraftModel from '@typings/database/models/servers/draft';
import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';

const {DRAFT, DRAFT_OUTBOX} = MM_TABLES.SERVER;
const SERVER_URL = 'drafts.query.test.com';

// prepare function that creates a draft+outbox on first mutation for a key and,
// on subsequent mutations for the same key, updates the message and bumps the generation.
const upsertPrepare = (message: string): PrepareDraftAndOutbox => ({database, channelId, rootId, draft, outbox}) => {
    const models = [];

    if (draft) {
        models.push(draft.prepareUpdate((d) => {
            d.message = message;
        }));
    } else {
        models.push(database.collections.get<DraftModel>(DRAFT).prepareCreate((d) => {
            d.channelId = channelId;
            d.rootId = rootId;
            d.message = message;
            d.updateAt = 1;
        }));
    }

    if (outbox) {
        models.push(outbox.prepareUpdate((o) => {
            o.generation += 1;
        }));
    } else {
        models.push(database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).prepareCreate((o) => {
            o._raw.id = buildDraftOutboxId(channelId, rootId);
            o.channelId = channelId;
            o.rootId = rootId;
            o.teamId = 'team1';
            o.operation = 'upsert';
            o.generation = 1;
            o.keepLocal = false;
            o.attemptCount = 0;
            o.nextAttemptAt = 0;
            o.status = 'pending';
        }));
    }

    return models;
};

describe('DraftOutbox serialized writer and repair', () => {
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        database = DatabaseManager.serverDatabases[SERVER_URL]!.database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    it('exposes both the Draft and DraftOutbox collections', () => {
        expect(database.collections.get(DRAFT)).toBeDefined();
        expect(database.collections.get(DRAFT_OUTBOX)).toBeDefined();
    });

    it('builds a deterministic, collision-safe outbox id', () => {
        expect(buildDraftOutboxId('channelid', '')).toBe('channelid-root');
        expect(buildDraftOutboxId('channelid', 'rootid')).toBe('channelid-rootid');
    });

    it('serializes concurrent first mutations into one Draft and one DraftOutbox with an incremented generation', async () => {
        const channelId = 'concurrentchannelid000000000';

        await Promise.all([
            mutateDraftAndOutbox(database, channelId, '', upsertPrepare('a')),
            mutateDraftAndOutbox(database, channelId, '', upsertPrepare('b')),
            mutateDraftAndOutbox(database, channelId, '', upsertPrepare('c')),
        ]);

        const drafts = await database.get<DraftModel>(DRAFT).query(Q.where('channel_id', channelId)).fetch();
        const outboxes = await database.get<DraftOutboxModel>(DRAFT_OUTBOX).query(Q.where('channel_id', channelId)).fetch();

        expect(drafts.length).toBe(1);
        expect(outboxes.length).toBe(1);
        expect(outboxes[0].id).toBe(buildDraftOutboxId(channelId, ''));
        expect(outboxes[0].generation).toBe(3);
    });

    it('commits neither the Draft nor the DraftOutbox when the batch fails', async () => {
        const channelId = 'atomicchannelid00000000000000';

        const batchSpy = jest.spyOn(database, 'batch').mockRejectedValueOnce(new Error('injected batch failure'));

        await expect(
            mutateDraftAndOutbox(database, channelId, '', upsertPrepare('a')),
        ).rejects.toThrow('injected batch failure');

        batchSpy.mockRestore();

        const drafts = await database.get<DraftModel>(DRAFT).query(Q.where('channel_id', channelId)).fetch();
        const outboxes = await database.get<DraftOutboxModel>(DRAFT_OUTBOX).query(Q.where('channel_id', channelId)).fetch();

        expect(drafts.length).toBe(0);
        expect(outboxes.length).toBe(0);
    });

    it('repairs duplicate drafts, keeping the greatest update_at then the greatest id by code-unit order', async () => {
        const updateAtChannel = 'dupupdatechannelid0000000000';
        const tieChannel = 'duptiechannelid00000000000000';

        // For the tie group, use mixed-case ids where UTF-16 code-unit order and locale
        // collation disagree: code-unit puts 'a' (0x61) AFTER 'Z' (0x5A), so 'aaaa...' is the
        // greatest and must be kept. localeCompare would treat case as a minor tiebreak and
        // could instead keep the 'Z...' id, so this guards the ordering.
        const tieCodeUnitGreatest = 'aaaaaaaaaaaaaaaaaaaaaaaaaa';
        const tieCodeUnitLeast = 'ZZZZZZZZZZZZZZZZZZZZZZZZZZ';

        await database.write(async (writer) => {
            const collection = database.get<DraftModel>(DRAFT);
            const models = [
                collection.prepareCreate((d) => {
                    d._raw.id = 'draftolderaaaaaaaaaaaaaaaaa';
                    d.channelId = updateAtChannel;
                    d.rootId = '';
                    d.message = 'older';
                    d.updateAt = 1;
                }),
                collection.prepareCreate((d) => {
                    d._raw.id = 'draftnewerbbbbbbbbbbbbbbbbb';
                    d.channelId = updateAtChannel;
                    d.rootId = '';
                    d.message = 'newer';
                    d.updateAt = 5;
                }),
                collection.prepareCreate((d) => {
                    d._raw.id = tieCodeUnitLeast;
                    d.channelId = tieChannel;
                    d.rootId = '';
                    d.message = 'tie-upper';
                    d.updateAt = 3;
                }),
                collection.prepareCreate((d) => {
                    d._raw.id = tieCodeUnitGreatest;
                    d.channelId = tieChannel;
                    d.rootId = '';
                    d.message = 'tie-lower';
                    d.updateAt = 3;
                }),
            ];
            await writer.batch(...models);
        }, 'seed-duplicates');

        const removed = await repairDuplicateDrafts(database);
        expect(removed).toBe(2);

        const updateAtRemaining = await database.get<DraftModel>(DRAFT).query(Q.where('channel_id', updateAtChannel)).fetch();
        expect(updateAtRemaining.length).toBe(1);
        expect(updateAtRemaining[0].updateAt).toBe(5);

        const tieRemaining = await database.get<DraftModel>(DRAFT).query(Q.where('channel_id', tieChannel)).fetch();
        expect(tieRemaining.length).toBe(1);
        expect(tieRemaining[0].id).toBe(tieCodeUnitGreatest);
    });

    it('round-trips a nullable server timestamp, parsed props, and unhydrated file ids (migration compatibility)', async () => {
        const channelId = 'roundtripchannelid0000000000';

        // A draft created without the new columns simulates a pre-migration (v20) row.
        await database.write(async () => {
            await database.get<DraftModel>(DRAFT).create((d) => {
                d.channelId = channelId;
                d.rootId = '';
                d.message = 'legacy';
                d.updateAt = 1;
            });
        }, 'seed-legacy-draft');

        let draft = await getDraft(database, channelId, '');
        expect(draft?.serverUpdateAt ?? null).toBeNull();
        expect(draft?.props ?? null).toBeNull();
        expect(draft?.fileIds).toEqual([]);

        await database.write(async () => {
            await draft!.update((d) => {
                d.serverUpdateAt = 123;
                d.props = {some_server_prop: true};
                d.fileIds = ['fileid1', 'fileid2'];
            });
        }, 'set-new-fields');

        draft = await getDraft(database, channelId, '');
        expect(draft?.serverUpdateAt).toBe(123);
        expect(draft?.props).toEqual({some_server_prop: true});
        expect(draft?.fileIds).toEqual(['fileid1', 'fileid2']);

        // No outbox is created by a plain Draft mutation in Phase 1.
        const outbox = await getDraftOutbox(database, channelId, '');
        expect(outbox).toBeUndefined();
    });

    it('migrates to schema version 21 by adding the Draft columns and creating the DraftOutbox table (non-destructive)', () => {
        const migration = ServerDatabaseMigrations.sortedMigrations.find((m) => m.toVersion === 21);
        expect(migration).toBeDefined();

        const steps = migration!.steps;

        // The migration must only ADD columns and CREATE a table; any other step type
        // (which could drop/rewrite data) would be a data-loss risk on upgrade.
        expect(steps.map((s) => s.type).sort()).toEqual(['add_columns', 'create_table']);

        const addColumnsStep = steps.find((s) => s.type === 'add_columns') as {table: string; columns: Array<{name: string; type: string; isOptional?: boolean}>};
        expect(addColumnsStep.table).toBe(DRAFT);
        expect(addColumnsStep.columns).toEqual([
            {name: 'server_update_at', type: 'number', isOptional: true},
            {name: 'props', type: 'string', isOptional: true},
            {name: 'file_ids', type: 'string', isOptional: true},
        ]);

        const createTableStep = steps.find((s) => s.type === 'create_table') as {schema: {name: string; columns: Record<string, {name: string; type: string; isOptional?: boolean}>}};
        expect(createTableStep.schema.name).toBe(DRAFT_OUTBOX);
        expect(Object.keys(createTableStep.schema.columns).sort()).toEqual([
            'attempt_count',
            'channel_id',
            'deleted_fingerprint',
            'generation',
            'keep_local',
            'last_error_code',
            'next_attempt_at',
            'operation',
            'root_id',
            'status',
            'team_id',
        ]);
    });

    it('repair run concurrently with a mutation on the same key never loses data or throws', async () => {
        const channelId = 'concurrentrepairchannelid0000';

        // Seed two duplicate drafts for the same key.
        await database.write(async (writer) => {
            const collection = database.get<DraftModel>(DRAFT);
            await writer.batch(
                collection.prepareCreate((d) => {
                    d._raw.id = 'concurloseraaaaaaaaaaaaaaaa';
                    d.channelId = channelId;
                    d.rootId = '';
                    d.message = 'loser';
                    d.updateAt = 1;
                }),
                collection.prepareCreate((d) => {
                    d._raw.id = 'concurwinnerbbbbbbbbbbbbbbb';
                    d.channelId = channelId;
                    d.rootId = '';
                    d.message = 'winner';
                    d.updateAt = 5;
                }),
            );
        }, 'seed-concurrent');

        // Run repair concurrently with a mutation that touches the same key. Both go through
        // database.write, so they serialize; neither should throw and exactly one draft must
        // remain for the key with a coherent (committed) state.
        await Promise.all([
            repairDuplicateDrafts(database),
            mutateDraftAndOutbox(database, channelId, '', upsertPrepare('edited')),
        ]);

        const remaining = await database.get<DraftModel>(DRAFT).query(Q.where('channel_id', channelId)).fetch();
        expect(remaining.length).toBe(1);

        // The mutation created its outbox row regardless of ordering.
        const outbox = await getDraftOutbox(database, channelId, '');
        expect(outbox).toBeDefined();
    });
});
