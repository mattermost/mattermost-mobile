// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getRequiredRedactionEpoch} from '@actions/local/redaction';
import {fetchPostById} from '@actions/remote/post';
import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

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
        const queue = this.queues[serverUrl];
        const key = `${item.postId}|${item.requiredEpoch}`;
        queue.inFlight.add(key);

        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

            // If the requirement moved on while this queued, the response would land below the gate
            // anyway. The viewport re-enqueues it.
            if ((await getRequiredRedactionEpoch(database)) > item.requiredEpoch) {
                this.metrics[serverUrl].discardedStale += 1;
                return;
            }

            // skipPostsInChannel: recording a standalone post as its channel's newest would create
            // or widen a PostsInChannel interval over posts we do not hold.
            const {error} = await fetchPostById(serverUrl, item.postId, false, undefined, true);
            if (error) {
                this.metrics[serverUrl].failed += 1;
                logDebug('RedactionRevalidationManager.run: could not revalidate', item.postId);
                return;
            }

            this.metrics[serverUrl].succeeded += 1;
        } catch (error) {
            this.metrics[serverUrl].failed += 1;
            logError('RedactionRevalidationManager.run', item.postId, getFullErrorMessage(error));
        } finally {
            const current = this.queues[serverUrl];
            if (current) {
                current.inFlight.delete(key);

                // No retry loop: it would spin while offline. The post stays hidden until a viewport
                // event, a reconnect, or the user re-enqueues it.
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
    };
}

export default new RedactionRevalidationManager();
