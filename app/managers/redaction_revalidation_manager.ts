// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject, type Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {getRequiredRedactionEpoch} from '@actions/local/redaction';
import {fetchPostById} from '@actions/remote/post';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';
import {isPostRedactionVerified} from '@utils/post';

/**
 * A page fetch re-evaluates only the newest chunk of a channel, so older posts keep the decision
 * they were stored with. They stay hidden until they come on screen and are revalidated one at a
 * time here, rather than eagerly re-downloading every cached channel's history.
 *
 * GET /posts/{id} runs the same metadata sanitization the channel endpoints do. POST /posts/ids does
 * not, so batching there would store exactly the metadata this feature exists to withhold.
 */
const MAX_CONCURRENT_REQUESTS = 3;

// Viewport events arrive in bursts, so a flick past twenty posts collapses into one round of
// requests for the ones that settled on screen.
const DEBOUNCE_MS = 300;

type QueuedPost = {
    postId: string;
    requiredEpoch: number;
};

type ServerQueue = {
    pending: Map<string, QueuedPost>;
    inFlight: Set<string>;
    debounce?: ReturnType<typeof setTimeout>;
};

type Metrics = {
    queued: number;
    succeeded: number;
    failed: number;
    discardedStale: number;
};

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
            this.queues[serverUrl] = {pending: new Map(), inFlight: new Set()};
            this.metrics[serverUrl] = {queued: 0, succeeded: 0, failed: 0, discardedStale: 0};
        }
        return this.queues[serverUrl];
    };

    /**
     * Deduplicated on (serverUrl, postId, requiredEpoch), so a post scrolling in and out of view
     * costs one request per generation. A queued entry for an older epoch is replaced, because only
     * the newest requirement can satisfy the gate.
     */
    public enqueue = (serverUrl: string, postId: string, requiredEpoch: number) => {
        const queue = this.getQueue(serverUrl);
        const key = `${postId}|${requiredEpoch}`;

        if (queue.inFlight.has(key)) {
            return;
        }

        const existing = queue.pending.get(postId);
        if (existing && existing.requiredEpoch >= requiredEpoch) {
            return;
        }

        queue.pending.set(postId, {postId, requiredEpoch});
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

    private drain = (serverUrl: string) => {
        const queue = this.queues[serverUrl];
        if (!queue) {
            return;
        }

        while (queue.inFlight.size < MAX_CONCURRENT_REQUESTS && queue.pending.size) {
            const next = queue.pending.values().next().value as QueuedPost | undefined;
            if (!next) {
                return;
            }
            queue.pending.delete(next.postId);
            this.run(serverUrl, next);
        }
    };

    private run = async (serverUrl: string, item: QueuedPost) => {
        // Captured so a logout while the request is in flight cannot touch the next session's queue.
        const queue = this.queues[serverUrl];
        const metrics = this.metrics[serverUrl];
        const isTornDown = () => this.queues[serverUrl] !== queue;
        const key = `${item.postId}|${item.requiredEpoch}`;
        queue.inFlight.add(key);

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

            // No retry loop: it would spin while offline. A failed post offers the user a retry.
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
