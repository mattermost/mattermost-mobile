// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject, type Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {getRequiredRedactionEpoch} from '@actions/local/redaction';
import {fetchPostById, revalidatePostsBefore} from '@actions/remote/post';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {getNewerPostInChannel, getPostById} from '@queries/servers/post';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';
import {isPostRedactionVerified} from '@utils/post';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

/**
 * A page fetch re-evaluates only the newest chunk of a channel, so older posts keep the decision
 * they were stored with. They stay hidden until they come on screen and are revalidated here, rather
 * than eagerly re-downloading every cached channel's history.
 *
 * In the channel list they are contiguous history, so one "posts before" page re-checks up to a
 * chunk of them at once. Everywhere else (search, saved, pinned, mentions, threads) the posts have
 * no shared page, so each is fetched on its own with GET /posts/{id}. Both run the same metadata
 * sanitization the channel endpoints do. POST /posts/ids does not, so batching there would store
 * exactly the metadata this feature exists to withhold.
 */
const MAX_CONCURRENT_REQUESTS = 3;

// Viewport events arrive in bursts, so a flick past twenty posts collapses into one round of
// requests for the ones that settled on screen.
const DEBOUNCE_MS = 300;

type QueuedPost = {
    postId: string;
    requiredEpoch: number;

    // Shown in the channel list, so it can be re-checked with its neighbours in one page.
    pageable: boolean;
};

type ServerQueue = {
    pending: Map<string, QueuedPost>;

    // Dedupe keys of the posts being re-checked right now.
    inFlight: Set<string>;

    // Requests in progress; a page counts once however many posts it carries.
    running: number;

    // One page at a time, or two overlapping batches would request the same block.
    pageInFlight: boolean;
    debounce?: ReturnType<typeof setTimeout>;
};

type Metrics = {
    queued: number;
    succeeded: number;
    failed: number;
    discardedStale: number;
    pageRequests: number;
};

type LoadedPost = {
    item: QueuedPost;
    post: PostModel;
};

const dedupeKey = (item: QueuedPost) => `${item.postId}|${item.requiredEpoch}`;

class RedactionRevalidationManager {
    private queues: {[serverUrl: string]: ServerQueue} = {};
    private metrics: {[serverUrl: string]: Metrics} = {};

    // Posts whose last attempt failed while the server was reachable. Nothing else would ask again,
    // so the placeholder offers a retry for them instead of reading "checking" indefinitely.
    private failures: {[serverUrl: string]: BehaviorSubject<Set<string>>} = {};

    private getFailures = (serverUrl: string) => {
        if (!this.failures[serverUrl]) {
            this.failures[serverUrl] = new BehaviorSubject(new Set<string>());
        }
        return this.failures[serverUrl];
    };

    private setFailed = (serverUrl: string, postId: string, failed: boolean) => {
        const subject = this.getFailures(serverUrl);
        if (subject.value.has(postId) === failed) {
            return;
        }
        const next = new Set(subject.value);
        if (failed) {
            next.add(postId);
        } else {
            next.delete(postId);
        }
        subject.next(next);
    };

    public observeRevalidationFailed = (serverUrl: string, postId: string): Observable<boolean> => {
        return this.getFailures(serverUrl).pipe(
            map((failed) => failed.has(postId)),
            distinctUntilChanged(),
        );
    };

    private getQueue = (serverUrl: string): ServerQueue => {
        if (!this.queues[serverUrl]) {
            this.queues[serverUrl] = {pending: new Map(), inFlight: new Set(), running: 0, pageInFlight: false};
            this.metrics[serverUrl] = {queued: 0, succeeded: 0, failed: 0, discardedStale: 0, pageRequests: 0};
        }
        return this.queues[serverUrl];
    };

    /**
     * Deduplicated on (serverUrl, postId, requiredEpoch), so a post scrolling in and out of view
     * costs one request per generation. A queued entry for an older epoch is replaced, because only
     * the newest requirement can satisfy the gate.
     */
    public enqueue = (serverUrl: string, postId: string, requiredEpoch: number, location?: AvailableScreens) => {
        const queue = this.getQueue(serverUrl);
        const item: QueuedPost = {postId, requiredEpoch, pageable: location === Screens.CHANNEL};

        if (queue.inFlight.has(dedupeKey(item))) {
            return;
        }

        const existing = queue.pending.get(postId);
        if (existing && existing.requiredEpoch >= requiredEpoch) {
            return;
        }

        queue.pending.set(postId, item);
        this.metrics[serverUrl].queued += 1;
        this.setFailed(serverUrl, postId, false);

        if (queue.debounce) {
            clearTimeout(queue.debounce);
        }
        queue.debounce = setTimeout(() => {
            queue.debounce = undefined;
            this.drain(serverUrl);
        }, DEBOUNCE_MS);
    };

    // For posts a page left unresolved; they skip the debounce and run on the next drain.
    private requeue = (queue: ServerQueue, item: QueuedPost) => {
        const existing = queue.pending.get(item.postId);
        if (existing && existing.requiredEpoch >= item.requiredEpoch) {
            return;
        }
        queue.pending.set(item.postId, item);
    };

    private nextRunnable = (queue: ServerQueue) => {
        for (const item of queue.pending.values()) {
            if (!item.pageable || !queue.pageInFlight) {
                return item;
            }
        }
        return undefined;
    };

    private drain = (serverUrl: string) => {
        const queue = this.queues[serverUrl];
        if (!queue) {
            return;
        }

        while (queue.running < MAX_CONCURRENT_REQUESTS && queue.pending.size) {
            const next = this.nextRunnable(queue);
            if (!next) {
                return;
            }

            if (next.pageable) {
                const batch = Array.from(queue.pending.values()).filter((p) => p.pageable);
                for (const p of batch) {
                    queue.pending.delete(p.postId);
                }
                this.runPage(serverUrl, batch);
            } else {
                queue.pending.delete(next.postId);
                this.run(serverUrl, next);
            }
        }
    };

    private run = async (serverUrl: string, item: QueuedPost) => {
        // Captured so a logout while the request is in flight cannot touch the next session's queue.
        const queue = this.queues[serverUrl];
        const metrics = this.metrics[serverUrl];
        const isTornDown = () => this.queues[serverUrl] !== queue;
        const key = dedupeKey(item);
        queue.inFlight.add(key);
        queue.running += 1;

        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

            // If the global requirement moved on while this queued, the response would land below
            // the gate anyway; the placeholder re-enqueues when its required epoch changes.
            if ((await getRequiredRedactionEpoch(database)) > item.requiredEpoch) {
                metrics.discardedStale += 1;
                return;
            }

            // A channel page fetch usually re-verifies the same posts while this was queued.
            const stored = await getPostById(database, item.postId);
            if (stored && isPostRedactionVerified(stored.redactionVerifiedEpoch, item.requiredEpoch)) {
                metrics.succeeded += 1;
                return;
            }

            // skipPostsInChannel: recording a standalone post as its channel's newest would create
            // or widen a PostsInChannel interval over posts we do not hold.
            const {error} = await fetchPostById(serverUrl, item.postId, false, undefined, true);
            if (isTornDown()) {
                return;
            }
            if (error) {
                metrics.failed += 1;
                this.setFailed(serverUrl, item.postId, true);
                logDebug('RedactionRevalidationManager.run: could not revalidate', item.postId);
                return;
            }

            metrics.succeeded += 1;
        } catch (error) {
            metrics.failed += 1;
            if (!isTornDown()) {
                this.setFailed(serverUrl, item.postId, true);
            }
            logError('RedactionRevalidationManager.run', item.postId, getFullErrorMessage(error));
        } finally {
            queue.inFlight.delete(key);
            queue.running -= 1;

            // No retry loop: it would spin while offline. A failed post offers the user a retry.
            if (!isTornDown()) {
                this.drain(serverUrl);
            }
        }
    };

    /**
     * Re-checks one channel's queued posts a page at a time: the block before the post just newer
     * than the newest queued one, so that post is its first entry. Whatever the page leaves
     * unverified is re-queued: older posts as another page, and posts inside the block that the
     * server did not return (deleted, moved) individually, so every post settles and the anchor only
     * ever moves back in history.
     */
    private runPage = async (serverUrl: string, items: QueuedPost[]) => {
        const queue = this.queues[serverUrl];
        const metrics = this.metrics[serverUrl];
        const isTornDown = () => this.queues[serverUrl] !== queue;
        const keys = items.map(dedupeKey);
        for (const key of keys) {
            queue.inFlight.add(key);
        }
        queue.running += 1;
        queue.pageInFlight = true;

        let group: LoadedPost[] = [];
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

            const requiredEpoch = await getRequiredRedactionEpoch(database);
            const current = items.filter((item) => item.requiredEpoch >= requiredEpoch);
            metrics.discardedStale += items.length - current.length;

            const stored = await Promise.all(current.map((item) => getPostById(database, item.postId)));
            const loaded: LoadedPost[] = [];
            current.forEach((item, i) => {
                const post = stored[i];
                if (!post) {
                    this.requeue(queue, {...item, pageable: false});
                } else if (isPostRedactionVerified(post.redactionVerifiedEpoch, item.requiredEpoch)) {
                    metrics.succeeded += 1;
                } else {
                    loaded.push({item, post});
                }
            });
            if (!loaded.length) {
                return;
            }

            // One channel per request; the rest wait for the next drain.
            const channelId = loaded[0].post.channelId;
            group = loaded.filter((l) => l.post.channelId === channelId).sort((a, b) => b.post.createAt - a.post.createAt);
            for (const other of loaded.filter((l) => l.post.channelId !== channelId)) {
                this.requeue(queue, other.item);
            }

            const [newest, ...older] = group;
            const anchor = await getNewerPostInChannel(database, channelId, newest.post.createAt);
            if (!anchor) {
                this.requeue(queue, {...newest.item, pageable: false});
                for (const o of older) {
                    this.requeue(queue, o.item);
                }
                group = [];
                return;
            }

            metrics.pageRequests += 1;
            const {error, oldestCreateAt} = await revalidatePostsBefore(serverUrl, channelId, anchor.id);
            if (isTornDown()) {
                return;
            }
            if (error) {
                metrics.failed += group.length;
                for (const g of group) {
                    this.setFailed(serverUrl, g.item.postId, true);
                }
                logDebug('RedactionRevalidationManager.runPage: could not revalidate', channelId, String(group.length));
                return;
            }

            // The anchored post never pages again: a gap between it and the anchor that the server
            // filled would keep the page from reaching it, and the same anchor would repeat forever.
            // Every later page anchors strictly further back.
            const refreshed = await Promise.all(group.map((g) => getPostById(database, g.item.postId)));
            group.forEach((g, i) => {
                const post = refreshed[i];
                if (post && isPostRedactionVerified(post.redactionVerifiedEpoch, g.item.requiredEpoch)) {
                    metrics.succeeded += 1;
                } else if (i > 0 && post && oldestCreateAt !== undefined && post.createAt < oldestCreateAt) {
                    this.requeue(queue, g.item);
                } else {
                    this.requeue(queue, {...g.item, pageable: false});
                }
            });
        } catch (error) {
            metrics.failed += group.length;
            if (!isTornDown()) {
                for (const g of group) {
                    this.setFailed(serverUrl, g.item.postId, true);
                }
            }
            logError('RedactionRevalidationManager.runPage', getFullErrorMessage(error));
        } finally {
            for (const key of keys) {
                queue.inFlight.delete(key);
            }
            queue.running -= 1;
            queue.pageInFlight = false;

            if (!isTornDown()) {
                this.drain(serverUrl);
            }
        }
    };

    public getMetrics = (serverUrl: string): Metrics | undefined => {
        return this.metrics[serverUrl];
    };

    public removeServer = (serverUrl: string) => {
        const queue = this.queues[serverUrl];
        if (queue?.debounce) {
            clearTimeout(queue.debounce);
        }
        delete this.queues[serverUrl];
        delete this.metrics[serverUrl];
        delete this.failures[serverUrl];
    };
}

export default new RedactionRevalidationManager();
