// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as LocalPost from '@actions/local/post';
import {AGENTS_TABLES} from '@agents/constants/database';
import {Screens} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {AUTO_CACHE_CLEANUP_PROTECTION_BUFFER} from '@constants/post';
import DatabaseManager from '@database/manager';
import OfflinePersistenceManager from '@managers/offline_persistence_manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {getCurrentChannelId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import {logError} from '@utils/log';

import {autoCacheCleanup} from './cleanup';

import type AiThreadModel from '@agents/types/database/models/ai_thread';
import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';

const {SERVER: {MY_CHANNEL, POST, POSTS_IN_CHANNEL, POSTS_IN_THREAD}} = MM_TABLES;
const {AI_THREAD} = AGENTS_TABLES;
const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

jest.mock('@managers/offline_persistence_manager', () => ({
    __esModule: true,
    default: {getAutoCacheCleanupDays: jest.fn()},
}));

jest.mock('@store/navigation_store', () => ({
    NavigationStore: {getScreensInStack: jest.fn()},
}));

jest.mock('@store/ephemeral_store', () => ({
    __esModule: true,
    default: {
        getCurrentChannelOldestVisibleCreateAt: jest.fn(),
        getCurrentThreadId: jest.fn(),
        getCurrentFileViewerPostId: jest.fn(),
        getCurrentPlaybookRunId: jest.fn(),
    },
}));

jest.mock('@utils/log');

jest.mock('@queries/servers/system', () => ({
    getCurrentChannelId: jest.fn(),
}));

jest.mock('@actions/local/post', () => ({
    deletePostsInChannelsByCutoff: jest.fn(),
}));

const SERVER_URL = 'cleanup.test.com';

// Fixed clock so Date.now() inside autoCacheCleanup is deterministic.
// cleanupDays=1 → cutoff = NOW - 1 day (DateConstants.SECONDS.DAY * 1000).
const NOW = 100_000_000;
const CUTOFF = NOW - (86_400 * 1000); // 13_600_000
const OLD = 1_000_000; // clearly below CUTOFF
const RECENT = NOW; // clearly above CUTOFF

let database: Database;
let operator: ServerDataOperator;

async function writePiC(channelId: string, earliest: number, latest: number): Promise<PostsInChannelModel> {
    let record!: PostsInChannelModel;
    await database.write(async () => {
        record = await database.get<PostsInChannelModel>(POSTS_IN_CHANNEL).create((r) => {
            r.channelId = channelId;
            r.earliest = earliest;
            r.latest = latest;
        });
    });
    return record;
}

async function writePiT(rootId: string, earliest: number, latest: number): Promise<PostsInThreadModel> {
    let record!: PostsInThreadModel;
    await database.write(async () => {
        record = await database.get<PostsInThreadModel>(POSTS_IN_THREAD).create((r) => {
            r.rootId = rootId;
            r.earliest = earliest;
            r.latest = latest;
        });
    });
    return record;
}

async function writeMyChannel(channelId: string, lastFetchedAt: number): Promise<void> {
    await database.write(async () => {
        await database.get<MyChannelModel>(MY_CHANNEL).create((r) => {
            r._raw.id = channelId;
            r.lastFetchedAt = lastFetchedAt;
        });
    });
}

async function writePost(id: string, channelId: string, createAt: number): Promise<void> {
    await database.write(async () => {
        await database.get(POST).create((r: any) => {
            r._raw.id = id;
            r.channelId = channelId;
            r.createAt = createAt;
            r.deleteAt = 0;
            r.editAt = 0;
            r.isPinned = false;
            r.message = '';
            r.messageSource = '';
            r.originalId = '';
            r.pendingPostId = '';
            r.previousPostId = '';
            r.props = '{}';
            r.rootId = '';
            r.type = '';
            r.updateAt = 0;
            r.userId = '';
        });
    });
}

async function writeAiThread(id: string, updateAt: number): Promise<void> {
    await database.write(async () => {
        await database.get<AiThreadModel>(AI_THREAD).create((r) => {
            r._raw.id = id;
            r.channelId = 'bot-dm';
            r.message = '';
            r.title = '';
            r.replyCount = 0;
            r.updateAt = updateAt;
        });
    });
}

async function writePlaybookRun(id: string, createAt: number): Promise<void> {
    await database.write(async () => {
        const run = await database.get(PLAYBOOK_RUN).create((r: any) => {
            r._raw.id = id;
            r.createAt = createAt;
        });
        const checklist = await database.get(PLAYBOOK_CHECKLIST).create((r: any) => {
            r.runId = run.id;
        });
        await database.get(PLAYBOOK_CHECKLIST_ITEM).create((r: any) => {
            r.checklistId = checklist.id;
        });
    });
}

describe('autoCacheCleanup', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
        await DatabaseManager.init([SERVER_URL]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(SERVER_URL));
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue('other-server');

        // LokiJS adapter has no unsafeVacuum; mock it to avoid a hanging toPromise callback
        jest.spyOn(database, 'unsafeVacuum').mockResolvedValue();
        jest.mocked(OfflinePersistenceManager.getAutoCacheCleanupDays).mockReturnValue(1);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([]);
        jest.mocked(EphemeralStore.getCurrentChannelOldestVisibleCreateAt).mockReturnValue(0);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue('');
        jest.mocked(EphemeralStore.getCurrentFileViewerPostId).mockReturnValue('');
        jest.mocked(EphemeralStore.getCurrentPlaybookRunId).mockReturnValue('');
        jest.mocked(getCurrentChannelId).mockResolvedValue('');
        jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mockResolvedValue({error: undefined});
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
        jest.restoreAllMocks();
    });

    // TC-1
    it('exits early without DB access when cleanupDays is 0 or negative', async () => {
        const dbSpy = jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator');

        jest.mocked(OfflinePersistenceManager.getAutoCacheCleanupDays).mockReturnValue(0);
        await autoCacheCleanup(SERVER_URL);

        jest.mocked(OfflinePersistenceManager.getAutoCacheCleanupDays).mockReturnValue(-3);
        await autoCacheCleanup(SERVER_URL);

        expect(dbSpy).not.toHaveBeenCalled();
    });

    // TC-2
    it('logs an error and returns when getServerDatabaseAndOperator throws', async () => {
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockImplementationOnce(() => {
            throw new Error('db unavailable');
        });

        await autoCacheCleanup(SERVER_URL);

        expect(logError).toHaveBeenCalledWith('autoCacheCleanup getServerDatabaseAndOperator', expect.any(Error));
    });

    // TC-3b
    it('does not call getCurrentChannelId when the channel screen is not in the navigation stack', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([]);

        await autoCacheCleanup(SERVER_URL);

        expect(getCurrentChannelId).not.toHaveBeenCalled();
    });

    // TC-4
    it('destroys the PiC row and resets MyChannel.lastFetchedAt for an entirely-stale unprotected range', async () => {
        const channelId = 'ch-stale';
        await writePiC(channelId, OLD - 100, OLD);
        await writeMyChannel(channelId, 1000);

        await autoCacheCleanup(SERVER_URL);

        const picRows = await database.get<PostsInChannelModel>(POSTS_IN_CHANNEL).query().fetch();
        expect(picRows.length).toBe(0);

        const mc = await database.get<MyChannelModel>(MY_CHANNEL).find(channelId);
        expect(mc.lastFetchedAt).toBe(0);
    });

    // TC-5
    it('updates PiC earliest to CUTOFF for a straddling range and preserves MyChannel.lastFetchedAt', async () => {
        const channelId = 'ch-straddle';
        await writePiC(channelId, OLD, RECENT);
        await writeMyChannel(channelId, 1000);

        await autoCacheCleanup(SERVER_URL);

        const [pic] = await database.get<PostsInChannelModel>(POSTS_IN_CHANNEL).query().fetch();
        expect(pic.earliest).toBe(CUTOFF);
        expect(pic.latest).toBe(RECENT);

        const mc = await database.get<MyChannelModel>(MY_CHANNEL).find(channelId);
        expect(mc.lastFetchedAt).toBe(1000);
    });

    // TC-6
    it('uses the 20th-older-post create_at as the effective cutoff for the viewed channel', async () => {
        const viewedChannelId = 'ch-viewed';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);

        // oldest-visible is slightly above CUTOFF
        const OLDEST_VISIBLE = CUTOFF + 2000;
        jest.mocked(EphemeralStore.getCurrentChannelOldestVisibleCreateAt).mockReturnValue(OLDEST_VISIBLE);

        // 20 posts older than OLDEST_VISIBLE; the 20th (oldest) lands below CUTOFF
        await Promise.all(
            Array.from({length: AUTO_CACHE_CLEANUP_PROTECTION_BUFFER}, (_, idx) =>
                writePost(`post-${idx + 1}`, viewedChannelId, OLDEST_VISIBLE - ((idx + 1) * 105)),
            ),
        );
        await writePiC(viewedChannelId, OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        // 20th post create_at = OLDEST_VISIBLE - 20*105 = CUTOFF - 100
        const PROTECTION_CUTOFF = OLDEST_VISIBLE - (AUTO_CACHE_CLEANUP_PROTECTION_BUFFER * 105);

        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [viewedChannelId], PROTECTION_CUTOFF, expect.any(Set),
        );

        const [pic] = await database.get<PostsInChannelModel>(POSTS_IN_CHANNEL).query().fetch();
        expect(pic.earliest).toBe(PROTECTION_CUTOFF);
    });

    // TC-7
    it('applies no extra protection when fewer than BUFFER posts precede the scroll anchor', async () => {
        const viewedChannelId = 'ch-viewed-few';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);
        jest.mocked(EphemeralStore.getCurrentChannelOldestVisibleCreateAt).mockReturnValue(CUTOFF + 500);

        // Only 5 posts older than anchor — fewer than BUFFER=20
        await Promise.all(
            Array.from({length: 5}, (_, idx) =>
                writePost(`post-few-${idx + 1}`, viewedChannelId, (CUTOFF + 500) - ((idx + 1) * 10)),
            ),
        );
        await writePiC(viewedChannelId, OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        // viewedChannelLimit = Infinity → effective cutoff = raw CUTOFF
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [viewedChannelId], CUTOFF, expect.any(Set),
        );

        const [pic] = await database.get<PostsInChannelModel>(POSTS_IN_CHANNEL).query().fetch();
        expect(pic.earliest).toBe(CUTOFF);
    });

    // TC-8
    it('skips the open-thread PiT row, adds its root to excluded IDs, and protects the thread-parent channel', async () => {
        const rootId = 'root-post';
        const threadParentChannelId = 'ch-thread-parent';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(rootId);

        await writePost(rootId, threadParentChannelId, OLD + 500);

        // straddles CUTOFF: without the skip it would get earliest updated; with skip it is preserved
        await writePiT(rootId, OLD, RECENT);

        // needs a PiC row so deletePostsInChannelsByCutoff is actually invoked
        await writePiC('ch-other', OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        // PiT row for the open thread must be unchanged
        const [pit] = await database.get<PostsInThreadModel>(POSTS_IN_THREAD).query().fetch();
        expect(pit.earliest).toBe(OLD);

        // Root post ID must appear in excludedPostIds of every deletePostsInChannelsByCutoff call
        const calls = jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mock.calls;
        const excluded = calls.flatMap((c) => [...(c[3] as Set<string>)]);
        expect(excluded).toContain(rootId);
    });

    // TC-9
    it('excludes active thread root IDs from post deletion even when the thread is not currently open', async () => {
        const rootId = 'live-root';

        // live thread: latest >= CUTOFF → rootId goes into activeThreadRootIds
        await writePiT(rootId, OLD, RECENT);
        await writePiC('ch-unprotected', OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        const [[, , , excludedPostIds]] = jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mock.calls;
        expect((excludedPostIds as Set<string>).has(rootId)).toBe(true);
    });

    // TC-10
    it('includes the file-viewer post ID in excludedPostIds passed to deletePostsInChannelsByCutoff', async () => {
        const filePostId = 'file-post-id';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentFileViewerPostId).mockReturnValue(filePostId);
        await writePiC('ch-file', OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        const [[, , , excludedPostIds]] = jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mock.calls;
        expect((excludedPostIds as Set<string>).has(filePostId)).toBe(true);
    });

    // TC-11
    it('destroys stale PiT rows, updates straddling PiT rows earliest to CUTOFF, and leaves the current-thread PiT row untouched', async () => {
        const currentThreadId = 'current-thread';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(currentThreadId);

        await writePiT('stale-root', OLD - 100, OLD);
        await writePiT('straddle-root', OLD, RECENT);
        await writePiT(currentThreadId, OLD, RECENT);

        // provide a post so getPostById succeeds for the open thread
        await writePost(currentThreadId, 'ch-parent', OLD + 50);

        await autoCacheCleanup(SERVER_URL);

        const pitRows = await database.get<PostsInThreadModel>(POSTS_IN_THREAD).query().fetch();
        expect(pitRows.length).toBe(2); // stale-root destroyed

        const straddle = pitRows.find((r) => r.rootId === 'straddle-root')!;
        expect(straddle.earliest).toBe(CUTOFF);

        const current = pitRows.find((r) => r.rootId === currentThreadId)!;
        expect(current.earliest).toBe(OLD); // not updated
    });

    // TC-12
    it('calls unsafeVacuum and stamps LAST_AUTO_CACHE_CLEANUP_RUN after a successful run', async () => {
        const vacuumSpy = jest.spyOn(database, 'unsafeVacuum');
        const handleSystemSpy = jest.spyOn(operator, 'handleSystem');

        await autoCacheCleanup(SERVER_URL);

        expect(vacuumSpy).toHaveBeenCalledTimes(1);
        expect(handleSystemSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                systems: expect.arrayContaining([
                    expect.objectContaining({id: SYSTEM_IDENTIFIERS.LAST_AUTO_CACHE_CLEANUP_RUN}),
                ]),
            }),
        );
    });

    // TC-13
    it('does not call unsafeVacuum and logs the error when cleanup throws mid-run', async () => {
        jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mockRejectedValueOnce(new Error('cleanup failed'));

        // entirely-recent range: no prepareUpdate called, so no orphaned record when the throw occurs
        await writePiC('ch-err', RECENT, RECENT + 100);

        const vacuumSpy = jest.spyOn(database, 'unsafeVacuum').mockResolvedValue();

        await autoCacheCleanup(SERVER_URL);

        expect(vacuumSpy).not.toHaveBeenCalled();
        expect(logError).toHaveBeenCalledWith('autoCacheCleanup', expect.any(Error));
    });

    // TC-14
    it('deletes AI threads older than the cutoff and keeps newer ones', async () => {
        await writeAiThread('ai-old', OLD);
        await writeAiThread('ai-recent', RECENT);

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(AI_THREAD).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['ai-recent']);
    });

    // TC-15
    it('spares the currently-viewed AI thread on the active server even when it is stale', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue('open-ai-thread');
        await writeAiThread('open-ai-thread', OLD);
        await writeAiThread('other', OLD);

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(AI_THREAD).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['open-ai-thread']);
    });

    // TC-16
    it('deletes all stale AI threads on a non-active server regardless of the viewed thread id', async () => {
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue('open-ai-thread');
        await writeAiThread('open-ai-thread', OLD);

        await autoCacheCleanup(SERVER_URL);

        const threads = await database.get(AI_THREAD).query().fetch();
        expect(threads.length).toBe(0);
    });

    // TC-17
    it('deletes playbook runs created before the cutoff and keeps newer ones', async () => {
        await writePlaybookRun('run-old', OLD);
        await writePlaybookRun('run-recent', RECENT);

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(PLAYBOOK_RUN).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['run-recent']);
    });

    // TC-18
    it('spares the currently-viewed playbook run on the active server even when it is stale', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentPlaybookRunId).mockReturnValue('open-run');
        await writePlaybookRun('open-run', OLD);
        await writePlaybookRun('other-run', OLD);

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(PLAYBOOK_RUN).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['open-run']);
    });

    // TC-19
    it('deletes all stale playbook runs on a non-active server regardless of the viewed run id', async () => {
        jest.mocked(EphemeralStore.getCurrentPlaybookRunId).mockReturnValue('open-run');
        await writePlaybookRun('open-run', OLD);

        await autoCacheCleanup(SERVER_URL);

        const runs = await database.get(PLAYBOOK_RUN).query().fetch();
        expect(runs.length).toBe(0);
    });

    // TC-20
    it('cascades deletion of a stale run to its checklists and checklist items', async () => {
        await writePlaybookRun('run-old', OLD);

        await autoCacheCleanup(SERVER_URL);

        const checklists = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
        const items = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
        expect(checklists.length).toBe(0);
        expect(items.length).toBe(0);
    });
});
