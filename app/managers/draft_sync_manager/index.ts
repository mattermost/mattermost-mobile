// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {DraftOutboxStatus, MAX_DRAFT_SYNC_EVENT_BUFFER} from '@constants/draft';
import DatabaseManager from '@database/manager';
import {getIsDraftSyncEnabled} from '@queries/servers/drafts';
import {logDebug} from '@utils/log';

import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';

const {DRAFT_OUTBOX} = MM_TABLES.SERVER;

// RETRY_ELIGIBLE_STATUSES: outbox statuses that represent outstanding work the retry timer must
// wake up for. Blocked/BlockedUpload/WaitingForUpload rows are intentionally excluded — they are
// parked awaiting an external signal (unblock, upload completion) and are NOT time-driven.
const RETRY_ELIGIBLE_STATUSES: DraftOutboxStatus[] = [
    DraftOutboxStatus.Pending,
    DraftOutboxStatus.ConfirmingDelete,
];

/**
 * DraftSyncManager (Phase 3 shell): the per-server coordinator for synchronized drafts.
 *
 * CRITICAL: this phase performs NO network activity. It owns per-server lifecycle state, a
 * lifecycle epoch used to reject stale async continuations, a bounded inbound WebSocket event
 * buffer, and a single durable retry timer per server that reconstructs itself from the
 * DraftOutbox. The retry timer's fire callback does NOT send anything — it merely re-queries the
 * outbox and reschedules itself (a self-rescheduling heartbeat). Phase 4 will add draining/POST/
 * DELETE/GET at the marked call sites.
 *
 * Per-server state is keyed by serverUrl. A server entry is "present" once initialize() (or any
 * scheduling path) has created it. A missing entry is treated as invalidated: no new work is
 * scheduled and captured epochs are considered stale.
 */
class DraftSyncManagerSingleton {
    // lifecycleEpoch: monotonically increasing per server; bumped by invalidate(). A captured
    // epoch that no longer matches (or whose server entry is gone) marks a stale continuation.
    private lifecycleEpoch: Record<string, number> = {};

    // retryTimers: at most one active setTimeout per server (the self-rescheduling heartbeat).
    private retryTimers: Record<string, ReturnType<typeof setTimeout>> = {};

    // eventBuffers: inbound WebSocket events awaiting Phase 4 draining, bounded by
    // MAX_DRAFT_SYNC_EVENT_BUFFER. Overflowing events are dropped (oldest kept) with a debug log.
    private eventBuffers: Record<string, WebSocketMessage[]> = {};

    // enabled: cached draft-sync capability per server (config AND user preference). false when
    // disabled OR invalidated so no work is scheduled.
    private enabled: Record<string, boolean> = {};

    // activeCriticalSections: count of in-flight DB writer sections. invalidate() only needs to
    // wait for these to reach 0 (there is no HTTP in this phase). Tracked here for Phase 4.
    private activeCriticalSections: Record<string, number> = {};

    // lastReconcile: last requested reconciliation intent per server (Phase 3 records only).
    private lastReconcile: Record<string, {teamId: string; reason: string}> = {};

    /**
     * initialize: idempotent per-server setup. Reads the draft-sync capability into `enabled` and,
     * when enabled, reconstructs the retry timer from the outbox. Safe to call when the server
     * database is absent (no-op after ensuring the entry exists). Never throws.
     */
    public initialize = async (serverUrl: string): Promise<void> => {
        this.ensureServer(serverUrl);

        const database = this.getDatabase(serverUrl);
        if (!database) {
            logDebug('DraftSyncManager.initialize: database absent', serverUrl);
            return;
        }

        try {
            this.enabled[serverUrl] = await getIsDraftSyncEnabled(database);
        } catch (error) {
            logDebug('DraftSyncManager.initialize: capability read failed', serverUrl);
            return;
        }

        if (this.enabled[serverUrl]) {
            await this.reconstructRetryTimer(serverUrl);
        }
    };

    /**
     * wake: called after a committed local mutation. Reconstructs/reschedules the retry timer so
     * newly-enqueued outbox work gets a heartbeat. Never sends.
     */
    public wake = (serverUrl: string): void => {
        if (!this.isActive(serverUrl)) {
            return;
        }

        // Fire-and-forget: reconstruction is async (DB query) but wake() is synchronous by contract.
        this.reconstructRetryTimer(serverUrl);
    };

    /**
     * requestReconcile: Phase 3 records the request (last teamId/reason) and ensures a retry timer
     * exists. It does NOT perform a GET — baseline reconciliation is Phase 4.
     */
    public requestReconcile = (serverUrl: string, teamId: string, reason: string): void => {
        if (!this.isActive(serverUrl)) {
            return;
        }

        this.lastReconcile[serverUrl] = {teamId, reason};
        logDebug('DraftSyncManager.requestReconcile', serverUrl, reason);

        // Phase 4: trigger baseline reconciliation here (GET drafts for the team, diff, reconcile).
        this.reconstructRetryTimer(serverUrl);
    };

    /**
     * enqueueWebSocketEvent: appends an inbound event synchronously before returning. Enforces the
     * buffer cap: when the buffer is full the event is dropped and an overflow is logged. Ignored
     * when disabled/invalidated. Does NOT process the event (Phase 4 drains it).
     */
    public enqueueWebSocketEvent = (serverUrl: string, event: WebSocketMessage): void => {
        if (!this.isActive(serverUrl)) {
            return;
        }

        const buffer = this.eventBuffers[serverUrl];
        if (buffer.length >= MAX_DRAFT_SYNC_EVENT_BUFFER) {
            logDebug('DraftSyncManager.enqueueWebSocketEvent: buffer overflow, dropping event', serverUrl, buffer.length);
            return;
        }

        buffer.push(event);
    };

    /**
     * handleCapabilityChange: re-reads the capability. enabled->disabled cancels the retry timer and
     * clears the event buffer WITHOUT deleting Draft/DraftOutbox data. disabled->enabled reconstructs
     * the retry timer and wakes.
     */
    public handleCapabilityChange = async (serverUrl: string): Promise<void> => {
        this.ensureServer(serverUrl);

        const database = this.getDatabase(serverUrl);
        if (!database) {
            logDebug('DraftSyncManager.handleCapabilityChange: database absent', serverUrl);
            return;
        }

        let nowEnabled: boolean;
        try {
            nowEnabled = await getIsDraftSyncEnabled(database);
        } catch (error) {
            logDebug('DraftSyncManager.handleCapabilityChange: capability read failed', serverUrl);
            return;
        }

        const wasEnabled = this.enabled[serverUrl];
        this.enabled[serverUrl] = nowEnabled;

        if (wasEnabled && !nowEnabled) {
            // enabled -> disabled: stop scheduling and drop transient state, but keep durable rows.
            this.clearRetryTimer(serverUrl);
            this.eventBuffers[serverUrl] = [];
            logDebug('DraftSyncManager.handleCapabilityChange: disabled', serverUrl);
            return;
        }

        if (!wasEnabled && nowEnabled) {
            // disabled -> enabled: resume the heartbeat.
            logDebug('DraftSyncManager.handleCapabilityChange: enabled', serverUrl);
            await this.reconstructRetryTimer(serverUrl);
            this.wake(serverUrl);
        }
    };

    /**
     * invalidate: SYNCHRONOUS teardown. Bumps the lifecycle epoch (so any captured epoch becomes
     * stale), cancels and clears the retry timer, clears the event buffer, and marks the server
     * disabled so no new work is scheduled. Does NOT await HTTP (there is none in this phase).
     */
    public invalidate = (serverUrl: string): void => {
        this.lifecycleEpoch[serverUrl] = (this.lifecycleEpoch[serverUrl] ?? 0) + 1;
        this.clearRetryTimer(serverUrl);
        this.eventBuffers[serverUrl] = [];
        this.enabled[serverUrl] = false;
        this.lastReconcile[serverUrl] = {teamId: '', reason: ''};
        logDebug('DraftSyncManager.invalidate', serverUrl);
    };

    // captureEpoch: returns the current lifecycle epoch for a later staleness comparison.
    private captureEpoch = (serverUrl: string): number => {
        return this.lifecycleEpoch[serverUrl] ?? 0;
    };

    // isEpochStale: true when the captured epoch no longer matches the current epoch or the server
    // entry has been removed. Guards async continuations before they touch the database.
    private isEpochStale = (serverUrl: string, captured: number): boolean => {
        if (!(serverUrl in this.lifecycleEpoch)) {
            return true;
        }
        return this.captureEpoch(serverUrl) !== captured;
    };

    /**
     * reconstructRetryTimer: rebuilds the single per-server heartbeat from the outbox.
     *
     * - When disabled/invalidated or the DB is absent, clears any existing timer and returns.
     * - Queries retry-eligible rows (Pending / ConfirmingDelete) and finds the earliest
     *   nextAttemptAt (0 meaning "eligible now").
     * - With none pending, clears the timer.
     * - Otherwise schedules ONE setTimeout for max(0, earliest - now). When it fires it guards on
     *   epoch staleness, then re-runs reconstruction (self-rescheduling). It sends NOTHING.
     */
    private reconstructRetryTimer = async (serverUrl: string): Promise<void> => {
        if (!this.isActive(serverUrl)) {
            this.clearRetryTimer(serverUrl);
            return;
        }

        const database = this.getDatabase(serverUrl);
        if (!database) {
            this.clearRetryTimer(serverUrl);
            return;
        }

        const captured = this.captureEpoch(serverUrl);

        let earliest: number | undefined;
        try {
            earliest = await this.getEarliestNextAttemptAt(database);
        } catch (error) {
            logDebug('DraftSyncManager.reconstructRetryTimer: outbox query failed', serverUrl);
            return;
        }

        // A concurrent invalidate/disable during the await must not resurrect a timer.
        if (this.isEpochStale(serverUrl, captured) || !this.isActive(serverUrl)) {
            return;
        }

        // Always clear the prior timer before deciding — guarantees one timer per server.
        this.clearRetryTimer(serverUrl);

        if (earliest === undefined) {
            return;
        }

        const delay = Math.max(0, earliest - Date.now());
        this.retryTimers[serverUrl] = setTimeout(() => {
            if (this.isEpochStale(serverUrl, captured)) {
                return;
            }

            // Phase 3: do NOT drain/POST/DELETE. Behave as a self-rescheduling heartbeat.
            // Phase 4: drain eligible outbox work here.
            this.reconstructRetryTimer(serverUrl);
        }, delay);
    };

    // getEarliestNextAttemptAt: earliest nextAttemptAt across retry-eligible outbox rows, or
    // undefined when there is no outstanding work.
    private getEarliestNextAttemptAt = async (database: Database): Promise<number | undefined> => {
        const rows = await database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query(
            Q.where('status', Q.oneOf(RETRY_ELIGIBLE_STATUSES)),
        ).fetch();

        if (!rows.length) {
            return undefined;
        }

        let earliest = rows[0].nextAttemptAt;
        for (const row of rows) {
            if (row.nextAttemptAt < earliest) {
                earliest = row.nextAttemptAt;
            }
        }
        return earliest;
    };

    // clearRetryTimer: cancels and forgets the per-server timer if present.
    private clearRetryTimer = (serverUrl: string): void => {
        const timer = this.retryTimers[serverUrl];
        if (timer) {
            clearTimeout(timer);
            delete this.retryTimers[serverUrl];
        }
    };

    // ensureServer: lazily creates the per-server state entry (idempotent).
    private ensureServer = (serverUrl: string): void => {
        if (!(serverUrl in this.lifecycleEpoch)) {
            this.lifecycleEpoch[serverUrl] = 0;
        }
        if (!(serverUrl in this.eventBuffers)) {
            this.eventBuffers[serverUrl] = [];
        }
        if (!(serverUrl in this.enabled)) {
            this.enabled[serverUrl] = false;
        }
        if (!(serverUrl in this.activeCriticalSections)) {
            this.activeCriticalSections[serverUrl] = 0;
        }
    };

    // isActive: the server is present, enabled, and not invalidated (invalidate sets enabled=false).
    private isActive = (serverUrl: string): boolean => {
        return Boolean(this.enabled[serverUrl]) && (serverUrl in this.eventBuffers);
    };

    // getDatabase: the server database or undefined when it is absent/destroyed. Never throws.
    private getDatabase = (serverUrl: string): Database | undefined => {
        return DatabaseManager.serverDatabases[serverUrl]?.database;
    };
}

const DraftSyncManager = new DraftSyncManagerSingleton();
export default DraftSyncManager;

export const exportedForTesting = {
    DraftSyncManagerSingleton,
    RETRY_ELIGIBLE_STATUSES,
};
