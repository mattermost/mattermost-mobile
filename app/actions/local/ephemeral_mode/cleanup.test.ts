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
import TestHelper from '@test/test_helper';
import {logError} from '@utils/log';

import {autoCacheCleanup} from './cleanup';

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

const PLAYBOOK_SEED = {processChildren: true, keepFinishedRuns: true, prepareRecordsOnly: false} as const;

let database: Database;
let operator: ServerDataOperator;

async function writePiC(channelId: string): Promise<void> {
    await database.write(async () => {
        await database.get<PostsInChannelModel>(POSTS_IN_CHANNEL).create((r) => {
            r.channelId = channelId;
            r.earliest = OLD;
            r.latest = RECENT;
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

describe('autoCacheCleanup', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
        await DatabaseManager.init([SERVER_URL]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(SERVER_URL));
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue('other-server');
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

    it('should exit early without DB access when cleanupDays is 0 or negative', async () => {
        const dbSpy = jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator');

        jest.mocked(EphemeralModeManager.getAutoCacheCleanupDays).mockReturnValue(0);
        const result = await autoCacheCleanup(SERVER_URL);

        jest.mocked(EphemeralModeManager.getAutoCacheCleanupDays).mockReturnValue(-3);
        await autoCacheCleanup(SERVER_URL);

        expect(dbSpy).not.toHaveBeenCalled();
        expect(result).toEqual({error: undefined, skipped: true});
    });

    it('should report an error rather than a skip when getServerDatabaseAndOperator throws', async () => {
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockImplementationOnce(() => {
            throw new Error('db unavailable');
        });

        const result = await autoCacheCleanup(SERVER_URL);

        expect(logError).toHaveBeenCalledWith('autoCacheCleanup getServerDatabaseAndOperator', 'db unavailable');
        expect(result).toEqual({error: new Error('db unavailable')});
    });

    it('should skip a concurrent invocation for the same server while a run is in flight', async () => {
        await writePiC('ch-concurrent');

        const [, second] = await Promise.all([autoCacheCleanup(SERVER_URL), autoCacheCleanup(SERVER_URL)]);

        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledTimes(1);
        expect(second).toEqual({error: undefined, skipped: true});
    });

    it('should skip the run without deleting anything when the cleanup already ran earlier today', async () => {
        // The same-day check compares against `new Date()`, which the Date.now mock does not affect
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LAST_AUTO_CACHE_CLEANUP_RUN, value: new Date().getTime()}],
            prepareRecordsOnly: false,
        });
        await writePiC('ch-already-ran');

        const result = await autoCacheCleanup(SERVER_URL);

        expect(LocalPost.deletePostsInChannelsByCutoff).not.toHaveBeenCalled();
        expect(result).toEqual({error: undefined, skipped: true});
    });

    it('should not call getCurrentChannelId when the channel screen is not in the navigation stack', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);

        await autoCacheCleanup(SERVER_URL);

        expect(getCurrentChannelId).not.toHaveBeenCalled();
    });

    it('should route the unprotected channel to the bulk call with the raw cutoff and excludes the viewed channel from it', async () => {
        const viewedChannelId = 'ch-viewed-routing';
        const unprotectedChannelId = 'ch-unprotected-routing';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);
        await writePiC(viewedChannelId);
        await writePiC(unprotectedChannelId);

        await autoCacheCleanup(SERVER_URL);

        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [unprotectedChannelId], CUTOFF, expect.any(Set),
        );

        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [viewedChannelId], CUTOFF, expect.any(Set),
        );
    });

    it('should not call the bulk unprotected-channels delete when every channel with post ranges is protected', async () => {
        const viewedChannelId = 'ch-only-viewed';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);
        await writePiC(viewedChannelId);

        await autoCacheCleanup(SERVER_URL);

        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledTimes(1);
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [viewedChannelId], CUTOFF, expect.any(Set),
        );
    });

    it('should use the create_at of the AUTO_CACHE_CLEANUP_PROTECTION_BUFFER-th older post as the effective cutoff for the viewed channel', async () => {
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
        await writePiC(viewedChannelId);

        await autoCacheCleanup(SERVER_URL);

        // AUTO_CACHE_CLEANUP_PROTECTION_BUFFER-th post create_at = OLDEST_VISIBLE - (BUFFER * 105) = CUTOFF - 100
        const PROTECTION_CUTOFF = OLDEST_VISIBLE - (AUTO_CACHE_CLEANUP_PROTECTION_BUFFER * 105);

        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [viewedChannelId], PROTECTION_CUTOFF, expect.any(Set),
        );
    });

    it('should apply no extra protection when fewer than BUFFER posts precede the scroll anchor', async () => {
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
        await writePiC(viewedChannelId);

        await autoCacheCleanup(SERVER_URL);

        // viewedChannelLimit = Infinity → effective cutoff = raw CUTOFF
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [viewedChannelId], CUTOFF, expect.any(Set),
        );
    });

    it('should skip the viewed-channel-specific delete call when the viewed channel has no PostsInChannel row', async () => {
        const viewedChannelId = 'ch-viewed-no-pic';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);
        await writePiC('ch-other-with-pic');

        await autoCacheCleanup(SERVER_URL);

        const calls = jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mock.calls;
        expect(calls.some((c) => c[1].includes(viewedChannelId))).toBe(false);
    });

    it('should add the open thread root to excluded IDs and skip the thread-parent-channel delete when it has no PostsInChannel row', async () => {
        const rootId = 'root-post';
        const threadParentChannelId = 'ch-thread-parent';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(rootId);

        await writePost(rootId, threadParentChannelId, OLD);

        // needs a PiC row so deletePostsInChannelsByCutoff is actually invoked
        await writePiC('ch-other');

        await autoCacheCleanup(SERVER_URL);

        // Root post ID must appear in excludedPostIds of every deletePostsInChannelsByCutoff call
        const calls = jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mock.calls;
        const excluded = calls.flatMap((c) => [...(c[3] as Set<string>)]);
        expect(excluded).toContain(rootId);

        // threadParentChannelId has no PiC row, so its channel-specific call is skipped
        expect(calls.some((c) => c[1].includes(threadParentChannelId))).toBe(false);
    });

    it('should protect the thread-parent channel down to the root create_at when fewer than BUFFER posts precede the root', async () => {
        const rootId = 'root-sparse-history';
        const threadParentChannelId = 'ch-thread-parent-sparse';
        const rootCreateAt = CUTOFF - 2000;
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(rootId);

        // no posts precede the root in this channel → createAtOfNthPostOlderThan returns undefined
        await writePost(rootId, threadParentChannelId, rootCreateAt);
        await writePiC(threadParentChannelId);

        await autoCacheCleanup(SERVER_URL);

        // without the root.createAt floor, this would fall back to the raw (less protective) CUTOFF
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [threadParentChannelId], rootCreateAt, expect.any(Set),
        );
    });

    it('should floor the cutoff at the root create_at when the open thread\'s parent channel is also the viewed channel', async () => {
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
        await writePiC(sharedChannelId);

        await autoCacheCleanup(SERVER_URL);

        // without folding threadParentLimit in, this would fall back to the raw (less protective) CUTOFF
        expect(LocalPost.deletePostsInChannelsByCutoff).toHaveBeenCalledWith(
            SERVER_URL, [sharedChannelId], rootCreateAt, expect.any(Set),
        );
    });

    it('should include the file-viewer post ID in excludedPostIds passed to deletePostsInChannelsByCutoff', async () => {
        const filePostId = 'file-post-id';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentFileViewerPostId).mockReturnValue(filePostId);
        await writePiC('ch-file');

        await autoCacheCleanup(SERVER_URL);

        const [[, , , excludedPostIds]] = jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mock.calls;
        expect((excludedPostIds as Set<string>).has(filePostId)).toBe(true);
    });

    it('should stamp LAST_AUTO_CACHE_CLEANUP_RUN after a successful run', async () => {
        const handleSystemSpy = jest.spyOn(operator, 'handleSystem');

        const result = await autoCacheCleanup(SERVER_URL);

        expect(handleSystemSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                systems: expect.arrayContaining([
                    expect.objectContaining({id: SYSTEM_IDENTIFIERS.LAST_AUTO_CACHE_CLEANUP_RUN}),
                ]),
            }),
        );
        expect(result).toEqual({error: undefined});
    });

    it('should report the error when the unprotected-channels delete call returns an error', async () => {
        jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mockResolvedValueOnce({error: new Error('cleanup failed')});

        await writePiC('ch-err');

        const result = await autoCacheCleanup(SERVER_URL);

        expect(logError).toHaveBeenCalledWith('autoCacheCleanup', 'cleanup failed');
        expect(result).toEqual({error: new Error('cleanup failed')});
    });

    it('should log the error when the viewed-channel delete call returns an error', async () => {
        const viewedChannelId = 'ch-viewed-err';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(NavigationStore.getScreensInStack).mockReturnValue([Screens.CHANNEL]);
        jest.mocked(getCurrentChannelId).mockResolvedValue(viewedChannelId);

        await writePiC(viewedChannelId);
        jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mockResolvedValueOnce({error: new Error('viewed channel delete failed')});

        await autoCacheCleanup(SERVER_URL);

        expect(logError).toHaveBeenCalledWith('autoCacheCleanup', 'viewed channel delete failed');
    });

    it('should log the error when the thread-parent-channel delete call returns an error', async () => {
        const rootId = 'root-err';
        const threadParentChannelId = 'ch-thread-parent-err';
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue(rootId);
        await writePost(rootId, threadParentChannelId, OLD);

        await writePiC(threadParentChannelId);
        jest.mocked(LocalPost.deletePostsInChannelsByCutoff).mockResolvedValueOnce({error: new Error('thread parent channel delete failed')});

        await autoCacheCleanup(SERVER_URL);

        expect(logError).toHaveBeenCalledWith('autoCacheCleanup', 'thread parent channel delete failed');
    });

    it('should delete AI threads older than the cutoff and keeps newer ones', async () => {
        await operator.handleAIThreads({
            threads: [
                TestHelper.fakeAiThread({id: 'ai-old', update_at: OLD}),
                TestHelper.fakeAiThread({id: 'ai-recent', update_at: RECENT}),
            ],
            prepareRecordsOnly: false,
        });

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(AI_THREAD).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['ai-recent']);
    });

    it('should spare the currently-viewed AI thread on the active server even when it is stale', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue('open-ai-thread');
        await operator.handleAIThreads({
            threads: [
                TestHelper.fakeAiThread({id: 'open-ai-thread', update_at: OLD}),
                TestHelper.fakeAiThread({id: 'other', update_at: OLD}),
            ],
            prepareRecordsOnly: false,
        });

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(AI_THREAD).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['open-ai-thread']);
    });

    it('should delete all stale AI threads on a non-active server regardless of the viewed thread id', async () => {
        jest.mocked(EphemeralStore.getCurrentThreadId).mockReturnValue('open-ai-thread');
        await operator.handleAIThreads({
            threads: [TestHelper.fakeAiThread({id: 'open-ai-thread', update_at: OLD})],
            prepareRecordsOnly: false,
        });

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(AI_THREAD).query().fetch()).map((r) => r.id);
        expect(ids).toEqual([]);
    });

    it('should delete playbook runs created before the cutoff and keeps newer ones', async () => {
        await operator.handlePlaybookRun({
            runs: [
                TestHelper.fakePlaybookRun({id: 'run-old', create_at: OLD, checklists: [TestHelper.fakePlaybookChecklist('run-old', {})]}),
                TestHelper.fakePlaybookRun({id: 'run-recent', create_at: RECENT, checklists: [TestHelper.fakePlaybookChecklist('run-recent', {})]}),
            ],
            ...PLAYBOOK_SEED,
        });

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(PLAYBOOK_RUN).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['run-recent']);
    });

    it('should spare the currently-viewed playbook run on the active server even when it is stale', async () => {
        jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(SERVER_URL);
        jest.mocked(EphemeralStore.getCurrentPlaybookRunId).mockReturnValue('open-run');
        await operator.handlePlaybookRun({
            runs: [
                TestHelper.fakePlaybookRun({id: 'open-run', create_at: OLD, checklists: [TestHelper.fakePlaybookChecklist('open-run', {})]}),
                TestHelper.fakePlaybookRun({id: 'other-run', create_at: OLD, checklists: [TestHelper.fakePlaybookChecklist('other-run', {})]}),
            ],
            ...PLAYBOOK_SEED,
        });

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(PLAYBOOK_RUN).query().fetch()).map((r) => r.id);
        expect(ids).toEqual(['open-run']);
    });

    it('should delete all stale playbook runs on a non-active server regardless of the viewed run id', async () => {
        jest.mocked(EphemeralStore.getCurrentPlaybookRunId).mockReturnValue('open-run');
        await operator.handlePlaybookRun({
            runs: [TestHelper.fakePlaybookRun({id: 'open-run', create_at: OLD, checklists: [TestHelper.fakePlaybookChecklist('open-run', {})]})],
            ...PLAYBOOK_SEED,
        });

        await autoCacheCleanup(SERVER_URL);

        const ids = (await database.get(PLAYBOOK_RUN).query().fetch()).map((r) => r.id);
        expect(ids).toEqual([]);
    });

    it('should cascade deletion of a stale run to its checklists and checklist items', async () => {
        await operator.handlePlaybookRun({
            runs: [TestHelper.fakePlaybookRun({id: 'run-old', create_at: OLD, checklists: [TestHelper.fakePlaybookChecklist('run-old', {})]})],
            ...PLAYBOOK_SEED,
        });

        await autoCacheCleanup(SERVER_URL);

        const checklists = await database.get(PLAYBOOK_CHECKLIST).query().fetch();
        const items = await database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();
        expect(checklists.length).toBe(0);
        expect(items.length).toBe(0);
    });
});
