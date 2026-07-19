// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type QueuedBlobOp =
    | {op: 'increment'; teamId: string; mentionDelta: number; threadMentionDelta: number; eventTimestamp: number}
    | {op: 'decrement'; teamId: string; clearedMentions: number; clearedThreadMentions: number; eventTimestamp: number}
    | {op: 'adjustThread'; teamId: string; mentionDelta: number; hasUnreadsAfter: boolean; eventTimestamp: number}
    | {op: 'clearThreads'; teamId: string; eventTimestamp: number}
    | {op: 'migrateDirectToTeam'; teamId: string; mentionCount: number; hasUnreads: boolean; eventTimestamp: number};

class SyncBlobQueueSingleton {
    private readonly syncing = new Set<string>();
    private readonly queues = new Map<string, QueuedBlobOp[]>();

    beginSync(serverUrl: string): void {
        this.syncing.add(serverUrl);
        this.queues.set(serverUrl, []);
    }

    isSyncing(serverUrl: string): boolean {
        return this.syncing.has(serverUrl);
    }

    queueBlobOp(serverUrl: string, op: QueuedBlobOp): void {
        this.queues.get(serverUrl)?.push(op);
    }

    endSync(serverUrl: string): QueuedBlobOp[] {
        this.syncing.delete(serverUrl);
        const drained = this.queues.get(serverUrl) ?? [];
        this.queues.delete(serverUrl);
        return drained;
    }
}

const SyncBlobQueue = new SyncBlobQueueSingleton();
export default SyncBlobQueue;
