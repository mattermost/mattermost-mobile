// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {deletePostsInChannelsByCutoff} from '@actions/local/post';
import {queryAIThreadsBefore} from '@agents/database/queries/thread';
import {Screens} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DateConstants from '@constants/datetime';
import {AUTO_CACHE_CLEANUP_PROTECTION_BUFFER} from '@constants/post';
import DatabaseManager from '@database/manager';
import OfflinePersistenceManager from '@managers/offline_persistence_manager';
import {queryPlaybookRunsBefore} from '@playbooks/database/queries/run';
import {
    createAtOfNthPostOlderThan,
    getPostById,
    queryActiveThreadRootIds,
} from '@queries/servers/post';
import {getCurrentChannelId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import {logDebug, logError} from '@utils/log';

import type {Database, Model} from '@nozbe/watermelondb';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {MY_CHANNEL, POSTS_IN_CHANNEL, POSTS_IN_THREAD, SYSTEM}} = MM_TABLES;

interface CleanupProtections {
    viewedChannelId: string | undefined;
    viewedChannelLimit: number;
    threadParentChannelId: string | undefined;
    threadParentLimit: number;
    viewedThreadId: string | undefined;
    activeThreadRootIds: Set<string>;
    fileViewerPostId: string | undefined;
    viewedPlaybookRunId: string | undefined;
}

async function getLastAutoCacheCleanupRun(database: Database): Promise<number> {
    try {
        const data = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.LAST_AUTO_CACHE_CLEANUP_RUN);
        return data?.value ? Number(data.value) : 0;
    } catch {
        return 0;
    }
}

async function setLastAutoCacheCleanupRun(serverUrl: string): Promise<void> {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LAST_AUTO_CACHE_CLEANUP_RUN, value: Date.now()}],
            prepareRecordsOnly: false,
        });
    } catch (error) {
        logError('autoCacheCleanup setLastAutoCacheCleanupRun', error);
    }
}

async function computeCleanupProtections(
    database: Database,
    cutoff: number,
    isActive: boolean,
): Promise<CleanupProtections> {
    // DB-consistency guard: always computed regardless of active server.
    // A thread with replies newer than cutoff is alive even if its root is old.
    const activeThreadRootIds = await queryActiveThreadRootIds(database, cutoff);

    if (!isActive) {
        return {
            viewedChannelId: undefined,
            viewedChannelLimit: Infinity,
            viewedThreadId: undefined,
            threadParentChannelId: undefined,
            threadParentLimit: Infinity,
            activeThreadRootIds,
            fileViewerPostId: undefined,
            viewedPlaybookRunId: undefined,
        };
    }

    const isChannelScreenMounted = NavigationStore.getScreensInStack().includes(Screens.CHANNEL);
    const viewedChannelId = (isChannelScreenMounted && await getCurrentChannelId(database)) || undefined;
    const oldestVisible = EphemeralStore.getCurrentChannelOldestVisibleCreateAt();

    let viewedChannelLimit = Infinity;
    if (viewedChannelId && oldestVisible) {
        viewedChannelLimit =
            await createAtOfNthPostOlderThan(
                database, viewedChannelId, oldestVisible, AUTO_CACHE_CLEANUP_PROTECTION_BUFFER,
            ) ?? Infinity;
    }

    const viewedThreadId = EphemeralStore.getCurrentThreadId() || undefined;
    let threadParentChannelId: string | undefined;
    let threadParentLimit = Infinity;

    if (viewedThreadId) {
        activeThreadRootIds.add(viewedThreadId);
        const rootPost = await getPostById(database, viewedThreadId);
        if (rootPost) {
            threadParentChannelId = rootPost.channelId;
            threadParentLimit =
                (await createAtOfNthPostOlderThan(
                    database, threadParentChannelId, rootPost.createAt, AUTO_CACHE_CLEANUP_PROTECTION_BUFFER,
                )) ?? Infinity;
        }
    }

    const fileViewerPostId = EphemeralStore.getCurrentFileViewerPostId() || undefined;
    const viewedPlaybookRunId = EphemeralStore.getCurrentPlaybookRunId() || undefined;

    return {
        viewedChannelId,
        viewedChannelLimit,
        viewedThreadId,
        threadParentChannelId,
        threadParentLimit,
        activeThreadRootIds,
        fileViewerPostId,
        viewedPlaybookRunId,
    };
}

function channelProtectionLimit(channelId: string, protections: CleanupProtections): number {
    if (channelId === protections.viewedChannelId) {
        return protections.viewedChannelLimit;
    }
    if (channelId === protections.threadParentChannelId) {
        return protections.threadParentLimit;
    }
    return Infinity;
}

async function cleanupPosts(
    serverUrl: string,
    database: Database,
    operator: {batchRecords: (models: Model[], description: string) => Promise<void>},
    cutoff: number,
    protections: CleanupProtections,
): Promise<void> {
    const postsInChannelItems = await database.get<PostInChannelModel>(POSTS_IN_CHANNEL).query().fetch();
    const myChannels = await database.get<MyChannelModel>(MY_CHANNEL).query().fetch();
    const myChannelIds = new Map(myChannels.map((mc) => [mc.id, mc]));

    const unprotectedChannels = new Set(postsInChannelItems.filter((row) => row.channelId !== protections.viewedChannelId && row.channelId !== protections.threadParentChannelId).map((row) => row.channelId));
    const channelsWithPostRanges = postsInChannelItems.reduce((map, row) => {
        map.set(row.channelId, (map.get(row.channelId) ?? 0) + 1);
        return map;
    }, new Map<string, number>());
    const prepared: Model[] = [];

    // iterate over channels with posts in the database
    for (const postInChannel of postsInChannelItems) {
        const computedChannelCutoff = Math.min(cutoff, channelProtectionLimit(postInChannel.channelId, protections));

        if (postInChannel.latest < computedChannelCutoff) {
            prepared.push(postInChannel.prepareDestroyPermanently());
            channelsWithPostRanges.set(postInChannel.channelId, (channelsWithPostRanges.get(postInChannel.channelId) ?? 0) - 1);
        } else if (postInChannel.earliest < computedChannelCutoff) {
            prepared.push(postInChannel.prepareUpdate((r: PostInChannelModel) => {
                r.earliest = computedChannelCutoff;
            }));
        }
    }

    const excludedPostIds: Set<string> = new Set([
        ...protections.activeThreadRootIds,
        ...(protections.fileViewerPostId ? [protections.fileViewerPostId] : []),
    ]);

    // delete posts in channels not currently being viewed using a single query
    if (unprotectedChannels.size > 0) {
        await deletePostsInChannelsByCutoff(serverUrl, Array.from(unprotectedChannels), cutoff, excludedPostIds);
    }

    // delete posts in viewed channel if any
    if (protections.viewedChannelId && channelsWithPostRanges.has(protections.viewedChannelId)) {
        const computedChannelCutoff = Math.min(cutoff, channelProtectionLimit(protections.viewedChannelId, protections));
        await deletePostsInChannelsByCutoff(serverUrl, [protections.viewedChannelId], computedChannelCutoff, excludedPostIds);
    }

    // delete posts in thread parent channel if any
    if (protections.threadParentChannelId && protections.threadParentChannelId !== protections.viewedChannelId && channelsWithPostRanges.has(protections.threadParentChannelId)) {
        const computedChannelCutoff = Math.min(cutoff, channelProtectionLimit(protections.threadParentChannelId, protections));
        await deletePostsInChannelsByCutoff(serverUrl, [protections.threadParentChannelId], computedChannelCutoff, excludedPostIds);
    }

    // Fetch PostInThread rows after deletions — deletePostsInChannelsByCutoff already removed rows
    // for deleted root posts, so this avoids calling prepareDestroyPermanently on gone records.
    const allPostInThreadRows = await database.get<PostsInThreadModel>(POSTS_IN_THREAD).query().fetch();

    // Update MyChannel lastFetchedAt to 0 for channels that have no posts left.
    channelsWithPostRanges.forEach((count, channelId) => {
        if (count <= 0) {
            const mc = myChannelIds.get(channelId);
            if (mc && mc.lastFetchedAt > 0) {
                prepared.push(mc.prepareUpdate((r: MyChannelModel) => {
                    r.lastFetchedAt = 0;
                }));
            }
        }
    });

    // PostsInThread bookkeeping.
    for (const postInThread of allPostInThreadRows) {
        if (postInThread.rootId === protections.viewedThreadId) {
            continue; // open thread is fully protected
        }
        if (postInThread.latest < cutoff) {
            prepared.push(postInThread.prepareDestroyPermanently());
        } else if (postInThread.earliest < cutoff) {
            prepared.push(postInThread.prepareUpdate((r: PostsInThreadModel) => {
                r.earliest = cutoff;
            }));
        }
    }

    if (prepared.length > 0) {
        await operator.batchRecords(prepared, 'autoCacheCleanupRanges');
    }
}

// AI threads self-heal on next open (re-fetched from the server), so the only
// protection is the currently-viewed thread. viewedThreadId is the open thread's
// root post id, which equals the AiThread id; it is undefined on non-active servers.
async function cleanupAiThreads(
    database: Database,
    operator: {batchRecords: (models: Model[], description: string) => Promise<void>},
    cutoff: number,
    viewedThreadId: string | undefined,
) {
    const staleThreads = await queryAIThreadsBefore(database, cutoff).fetch();
    const prepared = staleThreads.
        filter((thread) => thread.id !== viewedThreadId).
        map((thread) => thread.prepareDestroyPermanently());

    if (prepared.length > 0) {
        await operator.batchRecords(prepared, 'cleanupAiThreads');
    }
}

// Playbook runs re-fetch from the server on next open, so the only protection is
// the currently-viewed run; viewedPlaybookRunId is undefined on non-active servers.
async function cleanupPlaybookRuns(
    database: Database,
    operator: {batchRecords: (models: Model[], description: string) => Promise<void>},
    cutoff: number,
    viewedPlaybookRunId: string | undefined,
) {
    const staleRuns = await queryPlaybookRunsBefore(database, cutoff).fetch();
    const prepared = (await Promise.all(
        staleRuns.
            filter((run) => run.id !== viewedPlaybookRunId).
            map((run) => run.prepareDestroyWithRelations()),
    )).flat();

    if (prepared.length > 0) {
        await operator.batchRecords(prepared, 'cleanupPlaybookRuns');
    }
}

export async function autoCacheCleanup(serverUrl: string): Promise<void> {
    const cleanupDays = OfflinePersistenceManager.getAutoCacheCleanupDays(serverUrl);
    if (cleanupDays <= 0) {
        logDebug('autoCacheCleanup: cleanupDays <= 0 for', serverUrl);
        return;
    }

    let database: Database;
    let operator: {batchRecords: (models: Model[], description: string) => Promise<void>};
    try {
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    } catch (error) {
        logError('autoCacheCleanup getServerDatabaseAndOperator', error);
        return;
    }

    const toDate = (ms: number) => (ms ? new Date(ms).toString() : undefined);
    const lastRunAt = await getLastAutoCacheCleanupRun(database);
    const shouldRun = !lastRunAt || new Date(lastRunAt).toDateString() !== new Date().toDateString();
    logDebug('autoCacheCleanup: rolling cleanup check for', serverUrl, '— lastRunAt:', toDate(lastRunAt), '— shouldRun:', shouldRun);
    if (!shouldRun) {
        return;
    }

    try {
        const cutoff = Date.now() - (cleanupDays * DateConstants.SECONDS.DAY * 1000);
        const activeUrl = await DatabaseManager.getActiveServerUrl();
        const isActive = serverUrl === activeUrl;

        const limits = await computeCleanupProtections(database, cutoff, isActive);
        const toDateOrInf = (ms: number) => {
            if (!Number.isFinite(ms)) {
                return ms > 0 ? 'Infinity' : '-Infinity';
            }
            return new Date(ms).toString();
        };
        logDebug(
            'autoCacheCleanup: running for', serverUrl,
            '— cutoff:', toDate(cutoff),
            '— isActive:', isActive,
            '— currentChannelId:', limits.viewedChannelId,
            '— viewedChannelLimit:', toDateOrInf(limits.viewedChannelLimit),
            '— threadParentChannelId:', limits.threadParentChannelId,
            '— threadParentLimit:', toDateOrInf(limits.threadParentLimit),
            '— currentThreadId:', limits.viewedThreadId,
            '— activeThreadRootIds count:', limits.activeThreadRootIds.size,
            '— fileViewerPostId:', limits.fileViewerPostId,
            '— currentPlaybookRunId:', limits.viewedPlaybookRunId,
        );

        await cleanupPosts(serverUrl, database, operator, cutoff, limits);
        await cleanupAiThreads(database, operator, cutoff, limits.viewedThreadId);
        await cleanupPlaybookRuns(database, operator, cutoff, limits.viewedPlaybookRunId);

        await database.unsafeVacuum();
        await setLastAutoCacheCleanupRun(serverUrl);
        logDebug('autoCacheCleanup: completed successfully for', serverUrl);
    } catch (error) {
        logError('autoCacheCleanup', error);
    }
    logDebug('autoCacheCleanup: done for', serverUrl);
}
