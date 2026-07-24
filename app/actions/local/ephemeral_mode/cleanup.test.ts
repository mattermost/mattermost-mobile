// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as LocalPost from '@actions/local/post';
import {AGENTS_TABLES} from '@agents/constants/database';
import {Screens} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {AUTO_CACHE_CLEANUP_PROTECTION_BUFFER} from '@constants/post';
import DatabaseManager from '@database/manager';
import EphemeralModeManager from '@managers/ephemeral_mode_manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {getCurrentChannelId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import {logError} from '@utils/log';

import {autoCacheCleanup} from './cleanup';

import type AiThreadModel from '@agents/types/database/models/ai_thread';
import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';

const {SERVER: {POST, POSTS_IN_CHANNEL}} = MM_TABLES;
const {AI_THREAD} = AGENTS_TABLES;
const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

jest.mock('@managers/ephemeral_mode_manager', () => ({
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
const OLD = 1_000_000; // below CUTOFF
const RECENT = NOW; // above CUTOFF

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
        jest.mocked(EphemeralModeManager.getAutoCacheCleanupDays).mockReturnValue(1);
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

    it('exits early without DB access when cleanupDays is 0 or negative', async () => {
        const dbSpy = jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator');

        jest.mocked(EphemeralModeManager.getAutoCacheCleanupDays).mockReturnValue(0);
        await autoCacheCleanup(SERVER_URL);

        jest.mocked(EphemeralModeManager.getAutoCacheCleanupDays).mockReturnValue(-3);
        await autoCacheCleanup(SERVER_URL);

        expect(dbSpy).not.toHaveBeenCalled();
    });

    it('logs an error and returns when getServerDatabaseAndOperator throws', async () => {
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockImplementationOnce(() => {
            throw new Error('db unavailable');
        });

        await autoCacheCleanup(SERVER_URL);

        expect(logError).toHaveBeenCalledWith('autoCacheCleanup getServerDatabaseAndOperator', 'db unavailable');
    });

    it('does not call getCurrentChannelId when the channel screen is not in the navigation stack', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([]);

        await autoCacheCleanup(SERVER_URL);

        expect(getCurrentChannelId).not.toHaveBeenCalled();
    });

    it('routes the unprotected channel to the bulk call with the raw cutoff and excludes the viewed channel from it', async () => {
        const viewedChannelId = 'ch-viewed-routing';
        const unprotectedChannelId = 'ch-unprotected-routing';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);
        await writePiC(viewedChannelId, OLD, RECENT);
        await writePiC(unprotectedChannelId, OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        // unprotected channel is called with reconcile observers set to false
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [unprotectedChannelId], CUTOFF, expect.any(Set),
        );

        // the viewed channel is called with reconcile observers set to true
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [viewedChannelId], CUTOFF, expect.any(Set), true,
        );
    });

    it('does not call the bulk unprotected-channels delete when every channel with post ranges is protected', async () => {
        const viewedChannelId = 'ch-only-viewed';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);
        await writePiC(viewedChannelId, OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledTimes(1);
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [viewedChannelId], CUTOFF, expect.any(Set), true,
        );
    });

    it('uses the create_at of the AUTO_CACHE_CLEANUP_PROTECTION_BUFFER-th older post as the effective cutoff for the viewed channel', async () => {
        const viewedChannelId = 'ch-viewed';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);

        // oldest-visible is slightly above CUTOFF
        const OLDEST_VISIBLE = CUTOFF + 2000;
        jest.mocked(EphemeralStore.getCurrentChannelOldestVisibleCreateAt).mockReturnValue(OLDEST_VISIBLE);

        // AUTO_CACHE_CLEANUP_PROTECTION_BUFFER posts older than OLDEST_VISIBLE; the oldest of them lands below CUTOFF
        await Promise.all(
            Array.from({length: AUTO_CACHE_CLEANUP_PROTECTION_BUFFER}, (_, idx) =>
                writePost(`post-${idx + 1}`, viewedChannelId, OLDEST_VISIBLE - ((idx + 1) * 105)),
            ),
        );
        await writePiC(viewedChannelId, OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        // AUTO_CACHE_CLEANUP_PROTECTION_BUFFER-th post create_at = OLDEST_VISIBLE - (BUFFER * 105) = CUTOFF - 100
        const PROTECTION_CUTOFF = OLDEST_VISIBLE - (AUTO_CACHE_CLEANUP_PROTECTION_BUFFER * 105);

        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [viewedChannelId], PROTECTION_CUTOFF, expect.any(Set), true,
        );
    });

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
            SERVER_URL, [viewedChannelId], CUTOFF, expect.any(Set), true,
        );
    });

    it('skips the viewed-channel-specific delete call when the viewed channel has no PostsInChannel row', async () => {
        const viewedChannelId = 'ch-viewed-no-pic';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);
        await writePiC('ch-other-with-pic', OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        const calls = jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mock.calls;
        expect(calls.some((c) => (c[1] as string[]).includes(viewedChannelId))).toBe(false);
    });

    it('adds the open thread root to excluded IDs and skips the thread-parent-channel delete when it has no PostsInChannel row', async () => {
        const rootId = 'root-post';
        const threadParentChannelId = 'ch-thread-parent';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(rootId);

        await writePost(rootId, threadParentChannelId, OLD + 500);

        // needs a PiC row so deletePostsInChannelsByCutoff is actually invoked
        await writePiC('ch-other', OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        // Root post ID must appear in excludedPostIds of every deletePostsInChannelsByCutoff call
        const calls = jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mock.calls;
        const excluded = calls.flatMap((c) => [...(c[3] as Set<string>)]);
        expect(excluded).toContain(rootId);

        // threadParentChannelId has no PiC row, so its channel-specific call is skipped
        expect(calls.some((c) => (c[1] as string[]).includes(threadParentChannelId))).toBe(false);
    });

    it('protects the thread-parent channel down to the root create_at when fewer than BUFFER posts precede the root', async () => {
        const rootId = 'root-sparse-history';
        const threadParentChannelId = 'ch-thread-parent-sparse';
        const rootCreateAt = CUTOFF - 2000;
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(rootId);

        // no posts precede the root in this channel → createAtOfNthPostOlderThan returns undefined
        await writePost(rootId, threadParentChannelId, rootCreateAt);
        await writePiC(threadParentChannelId, OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        // without the root.createAt floor, this would fall back to the raw (less protective) CUTOFF
        // thread parent channel is called with reconcile observers set to true
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [threadParentChannelId], rootCreateAt, expect.any(Set), true,
        );
    });

    it('floors the cutoff at the root create_at when the open thread\'s parent channel is also the viewed channel', async () => {
        const rootId = 'root-same-channel';
        const sharedChannelId = 'ch-same-as-viewed';
        const rootCreateAt = CUTOFF - 2000;
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(sharedChannelId);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(rootId);

        // oldest-visible left at 0 (falsy) so viewedChannelLimit stays Infinity and can't
        // provide the protection on its own — only the thread-parent floor can.
        await writePost(rootId, sharedChannelId, rootCreateAt);
        await writePiC(sharedChannelId, OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        // without folding threadParentLimit in, this would fall back to the raw (less protective) CUTOFF
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [sharedChannelId], rootCreateAt, expect.any(Set), true,
        );
    });

    it('includes the file-viewer post ID in excludedPostIds passed to deletePostsInChannelsByCutoff', async () => {
        const filePostId = 'file-post-id';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentFileViewerPostId).mockReturnValue(filePostId);
        await writePiC('ch-file', OLD, RECENT);

        await autoCacheCleanup(SERVER_URL);

        const [[, , , excludedPostIds]] = jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mock.calls;
        expect((excludedPostIds as Set<string>).has(filePostId)).toBe(true);
    });

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

    it('stamps LAST_AUTO_CACHE_CLEANUP_RUN and logs the error when unsafeVacuum rejects', async () => {
        jest.spyOn(database, 'unsafeVacuum').mockRejectedValue(new Error('vacuum failed'));
        const handleSystemSpy = jest.spyOn(operator, 'handleSystem');

        await autoCacheCleanup(SERVER_URL);

        expect(handleSystemSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                systems: expect.arrayContaining([
                    expect.objectContaining({id: SYSTEM_IDENTIFIERS.LAST_AUTO_CACHE_CLEANUP_RUN}),
                ]),
            }),
        );
        expect(logError).toHaveBeenCalledWith('autoCacheCleanup unsafeVacuum', 'vacuum failed');
    });

    it('does not call unsafeVacuum and logs the error when the unprotected-channels delete call returns an error', async () => {
        jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mockResolvedValueOnce({error: new Error('cleanup failed')});

        await writePiC('ch-err', OLD, RECENT);

        const vacuumSpy = jest.spyOn(database, 'unsafeVacuum').mockResolvedValue();

        await autoCacheCleanup(SERVER_URL);

        expect(vacuumSpy).not.toHaveBeenCalled();
        expect(logError).toHaveBeenCalledWith('autoCacheCleanup', 'cleanup failed');
    });

    it('does not call unsafeVacuum and logs the error when the viewed-channel delete call returns an error', async () => {
        const viewedChannelId = 'ch-viewed-err';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);

        await writePiC(viewedChannelId, OLD, RECENT);
        jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mockResolvedValueOnce({error: new Error('viewed channel delete failed')});

        const vacuumSpy = jest.spyOn(database, 'unsafeVacuum').mockResolvedValue();

        await autoCacheCleanup(SERVER_URL);

        expect(vacuumSpy).not.toHaveBeenCalled();
        expect(logError).toHaveBeenCalledWith('autoCacheCleanup', 'viewed channel delete failed');
    });

    it('does not call unsafeVacuum and logs the error when the thread-parent-channel delete call returns an error', async () => {
        const rootId = 'root-err';
        const threadParentChannelId = 'ch-thread-parent-err';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(rootId);
        await writePost(rootId, threadParentChannelId, OLD + 500);

        await writePiC(threadParentChannelId, OLD, RECENT);
        jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mockResolvedValueOnce({error: new Error('thread parent channel delete failed')});

        const vacuumSpy = jest.spyOn(database, 'unsafeVacuum').mockResolvedValue();

        await autoCacheCleanup(SERVER_URL);

        expect(vacuumSpy).not.toHaveBeenCalled();
        expect(logError).toHaveBeenCalledWith('autoCacheCleanup', 'thread parent channel delete failed');
    });

    it('deletes AI threads older than the cutoff and keeps newer ones', async () => {
        await writeAiThread('ai-old', OLD);
        await writeAiThread('ai-recent', RECENT);

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(AI_THREAD).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['ai-recent']);
    });

    it('spares the currently-viewed AI thread on the active server even when it is stale', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue('open-ai-thread');
        await writeAiThread('open-ai-thread', OLD);
        await writeAiThread('other', OLD);

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(AI_THREAD).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['open-ai-thread']);
    });

    it('deletes all stale AI threads on a non-active server regardless of the viewed thread id', async () => {
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue('open-ai-thread');
        await writeAiThread('open-ai-thread', OLD);

        await autoCacheCleanup(SERVER_URL);

        const threads = await database.get(AI_THREAD).query().fetch();
        expect(threads.length).toBe(0);
    });

    it('deletes playbook runs created before the cutoff and keeps newer ones', async () => {
        await writePlaybookRun('run-old', OLD);
        await writePlaybookRun('run-recent', RECENT);

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(PLAYBOOK_RUN).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['run-recent']);
    });

    it('spares the currently-viewed playbook run on the active server even when it is stale', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentPlaybookRunId).mockReturnValue('open-run');
        await writePlaybookRun('open-run', OLD);
        await writePlaybookRun('other-run', OLD);

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(PLAYBOOK_RUN).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['open-run']);
    });

    it('deletes all stale playbook runs on a non-active server regardless of the viewed run id', async () => {
        jest.mocked(EphemeralStore.getCurrentPlaybookRunId).mockReturnValue('open-run');
        await writePlaybookRun('open-run', OLD);

        await autoCacheCleanup(SERVER_URL);

        const runs = await database.get(PLAYBOOK_RUN).query().fetch();
        expect(runs.length).toBe(0);
    });

    it('cascades deletion of a stale run to its checklists and checklist items', async () => {
        await writePlaybookRun('run-old', OLD);

        await autoCacheCleanup(SERVER_URL);

        const checklists = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
        const items = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
        expect(checklists.length).toBe(0);
        expect(items.length).toBe(0);
    });
});
