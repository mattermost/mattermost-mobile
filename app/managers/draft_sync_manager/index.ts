// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {confirmDeleteTombstone, deleteAbsentCleanDraft, getReconcilableKeys, reconcileTeamDrafts, type ReconcileKey} from '@actions/remote/draft';
import {MM_TABLES} from '@constants/database';
import {DRAFT_ABSENCE_CONFIRMATION_DELAY_MS, DraftOutboxOperation, DraftOutboxStatus, MAX_DRAFT_SYNC_EVENT_BUFFER} from '@constants/draft';
import DatabaseManager from '@database/manager';
import {buildDraftOutboxId, getIsDraftSyncEnabled} from '@queries/servers/drafts';
import {logDebug} from '@utils/log';

import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';
import type {NormalizedDraft} from '@utils/draft/sync';

// AbsenceCandidate: an in-memory record that a draft key was observed absent from a successful GET
// snapshot. Deletion is only confirmed on a SECOND same-scope absence >= DRAFT_ABSENCE_CONFIRMATION_
// DELAY_MS later. Losing these on restart is safe — it merely delays (never mis-triggers) deletion.
type AbsenceCandidate = {firstAbsentAt: number; teamId: string};

/**
 * isAbsenceEligible: whether an in-scope key that is ABSENT from the snapshot may (eventually) be
 * removed. A non-authoritative key (membership lost) is never eligible. A plain Draft is eligible
 * only when it is clean and server-backed (serverUpdateAt > 0, no outbox). A delete tombstone is
 * eligible only while it is a Delete in a Pending/ConfirmingDelete status.
 */
const isAbsenceEligible = (entry: ReconcileKey): boolean => {
    if (!entry.authoritative) {
        return false;
    }

    if (entry.kind === 'draft') {
        return entry.serverUpdateAt > 0 && !entry.hasOutbox;
    }

    return entry.outboxOperation === DraftOutboxOperation.Delete &&
        (entry.outboxStatus === DraftOutboxStatus.Pending || entry.outboxStatus === DraftOutboxStatus.ConfirmingDelete);
};

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

    // baseline: the last successful reconciliation snapshot marker per server (teamId + timestamp).
    // Set only after a reconcile whose epoch stayed valid succeeds. A later sub-step uses it to gate
    // absence-based decisions; this sub-step only records it.
    private baseline: Record<string, {teamId: string; at: number}> = {};

    // reconcileInFlight: true while a reconcile await is outstanding for the server (single-flight).
    private reconcileInFlight: Record<string, boolean> = {};

    // reconcilePending: a coalesced reconcile request that arrived while one was in flight. Drained
    // (run once) after the in-flight reconcile settles.
    private reconcilePending: Record<string, {teamId: string} | undefined> = {};

    // absenceCandidates: per-server map (draftKey -> first-absence observation) for the two-observation
    // replica-lag guard. A key is only deleted after being observed absent in TWO same-scope reconciles
    // separated by >= DRAFT_ABSENCE_CONFIRMATION_DELAY_MS. Cleared on invalidate; safe to lose.
    private absenceCandidates: Record<string, Map<string, AbsenceCandidate>> = {};

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
     * requestReconcile: records the request and fires the additive baseline reconciliation
     * (fire-and-forget; synchronous by contract). Draining/absence-detection stay in later sub-steps.
     */
    public requestReconcile = (serverUrl: string, teamId: string, reason: string): void => {
        if (!this.isActive(serverUrl)) {
            return;
        }

        this.lastReconcile[serverUrl] = {teamId, reason};
        logDebug('DraftSyncManager.requestReconcile', serverUrl, reason);

        // Phase 4.1: additive baseline reconciliation (GET drafts for the team, apply the snapshot).
        // Absence-based deletion and POST/DELETE draining are deliberately NOT done here.
        this.reconcile(serverUrl, teamId);
    };

    /**
     * reconcile: single-flight, epoch-guarded additive baseline reconciliation for a team. It applies
     * the server snapshot via reconcileTeamDrafts (which never deletes for absence) and, on success,
     * records the baseline. It never drains/POSTs/DELETEs. Concurrent requests coalesce: the latest
     * teamId is remembered and run once after the in-flight pass settles.
     */
    private reconcile = async (serverUrl: string, teamId: string): Promise<void> => {
        if (!this.isActive(serverUrl)) {
            return;
        }

        if (this.reconcileInFlight[serverUrl]) {
            // Coalesce: remember the latest request and let the in-flight pass drain it when it ends.
            this.reconcilePending[serverUrl] = {teamId};
            return;
        }

        this.reconcileInFlight[serverUrl] = true;
        const captured = this.captureEpoch(serverUrl);

        let res: Awaited<ReturnType<typeof reconcileTeamDrafts>>;
        try {
            res = await reconcileTeamDrafts(serverUrl, teamId);
        } catch (error) {
            res = {error};
        }

        // A concurrent invalidate/disable during the await discards this continuation entirely.
        if (this.isEpochStale(serverUrl, captured) || !this.isActive(serverUrl)) {
            this.reconcileInFlight[serverUrl] = false;
            return;
        }

        if (res.error) {
            // Failure: do NOT set a baseline and run NO absence pass. Without a snapshot nothing may
            // be deleted. The heartbeat will re-request later.
            logDebug('DraftSyncManager.reconcile: reconciliation failed', serverUrl);
            this.reconstructRetryTimer(serverUrl);
        } else {
            this.baseline[serverUrl] = {teamId, at: Date.now()};

            // Absence pass: a successful snapshot lets us quarantine/confirm keys that are absent
            // from it. Epoch-guarded internally; it never POSTs/DELETEs over the network.
            await this.runAbsencePass(serverUrl, teamId, res.drafts ?? [], captured);
        }

        this.reconcileInFlight[serverUrl] = false;

        const pending = this.reconcilePending[serverUrl];
        if (pending) {
            this.reconcilePending[serverUrl] = undefined;
            this.reconcile(serverUrl, pending.teamId);
        }
    };

    /**
     * runAbsencePass: SAFE absence-based local convergence after a successful snapshot. Every in-scope
     * key that has a Draft and/or a delete tombstone is classified: keys present in the snapshot clear
     * their candidate; ineligible keys (legacy/local-only, pending intent, membership lost) are
     * preserved and clear their candidate; eligible-but-absent keys are QUARANTINED on first absence
     * and only CONFIRMED (deleted / tombstone-resolved) on a second same-scope absence >= DELAY later.
     * It performs NO network activity and re-checks epoch staleness before each mutation.
     */
    private runAbsencePass = async (serverUrl: string, teamId: string, drafts: NormalizedDraft[], captured: number): Promise<void> => {
        const database = this.getDatabase(serverUrl);
        const candidates = this.absenceCandidates[serverUrl];
        if (!database || !candidates) {
            return;
        }

        let universe: ReconcileKey[];
        try {
            universe = await getReconcilableKeys(database, teamId);
        } catch (error) {
            logDebug('DraftSyncManager.runAbsencePass: universe query failed', serverUrl);
            return;
        }

        // A concurrent invalidate/disable during the await discards this pass entirely.
        if (this.isEpochStale(serverUrl, captured) || !this.isActive(serverUrl)) {
            return;
        }

        const present = new Set(drafts.map((d) => buildDraftOutboxId(d.channelId, d.rootId)));
        const universeKeys = new Set(universe.map((e) => buildDraftOutboxId(e.channelId, e.rootId)));
        const now = Date.now();

        // Drop candidates for keys that vanished from the universe by other means (deleted locally, etc.).
        for (const key of candidates.keys()) {
            if (!universeKeys.has(key)) {
                candidates.delete(key);
            }
        }

        const confirmed: ReconcileKey[] = [];
        for (const entry of universe) {
            const key = buildDraftOutboxId(entry.channelId, entry.rootId);

            // Reappeared or ineligible (preserve): clear any absence candidate.
            if (present.has(key) || !isAbsenceEligible(entry)) {
                candidates.delete(key);
                continue;
            }

            const candidate = candidates.get(key);
            if (!candidate) {
                // First absence: quarantine, delete nothing yet.
                candidates.set(key, {firstAbsentAt: now, teamId});
            } else if (candidate.teamId !== teamId) {
                // Scope changed since the first observation: restart the window under the new scope.
                candidates.set(key, {firstAbsentAt: now, teamId});
            } else if ((now - candidate.firstAbsentAt) >= DRAFT_ABSENCE_CONFIRMATION_DELAY_MS) {
                // Second same-scope absence past the delay: deletion confirmed.
                confirmed.push(entry);
            }
        }

        for (const entry of confirmed) {
            if (this.isEpochStale(serverUrl, captured) || !this.isActive(serverUrl)) {
                return;
            }

            if (entry.kind === 'tombstone') {
                // eslint-disable-next-line no-await-in-loop
                await confirmDeleteTombstone(serverUrl, entry.channelId, entry.rootId);
            } else {
                // eslint-disable-next-line no-await-in-loop
                await deleteAbsentCleanDraft(serverUrl, entry.channelId, entry.rootId);
            }
            candidates.delete(buildDraftOutboxId(entry.channelId, entry.rootId));
        }

        if (confirmed.length) {
            logDebug('DraftSyncManager.runAbsencePass: confirmed absence deletions', serverUrl, confirmed.length);
        }
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
        delete this.baseline[serverUrl];
        this.reconcileInFlight[serverUrl] = false;
        this.reconcilePending[serverUrl] = undefined;
        this.absenceCandidates[serverUrl] = new Map();
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
        if (!(serverUrl in this.reconcileInFlight)) {
            this.reconcileInFlight[serverUrl] = false;
        }
        if (!(serverUrl in this.reconcilePending)) {
            this.reconcilePending[serverUrl] = undefined;
        }
        if (!(serverUrl in this.absenceCandidates)) {
            this.absenceCandidates[serverUrl] = new Map();
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

// ManagerBaselineInternals: narrow view onto the private baseline/single-flight state so tests can
// assert reconciliation bookkeeping without adding production-only accessors.
export type ManagerBaselineInternals = {
    baseline: Record<string, {teamId: string; at: number}>;
    reconcileInFlight: Record<string, boolean>;
    reconcilePending: Record<string, {teamId: string} | undefined>;
    absenceCandidates: Record<string, Map<string, {firstAbsentAt: number; teamId: string}>>;
};
