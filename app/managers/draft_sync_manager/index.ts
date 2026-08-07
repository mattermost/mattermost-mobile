// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {computeNextAttemptAt, confirmDeleteTombstone, deleteAbsentCleanDraft, getReconcilableKeys, processOutboxDelete, processOutboxUpsert, reconcileTeamDrafts, type OutboxWorkerOpts, type ReconcileKey, type WorkerOutcome} from '@actions/remote/draft';
import {General} from '@constants';
import {MM_TABLES} from '@constants/database';
import {DRAFT_ABSENCE_CONFIRMATION_DELAY_MS, DRAFT_SYNC_RETRY_BASE_MS, DRAFT_SYNC_RETRY_JITTER, DRAFT_SYNC_RETRY_MAX_MS, DraftOutboxOperation, DraftOutboxStatus, MAX_DRAFT_SYNC_EVENT_BUFFER} from '@constants/draft';
import DatabaseManager from '@database/manager';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {buildDraftOutboxId, getIsDraftSyncEnabled, mutateDraftAndOutbox} from '@queries/servers/drafts';
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

/**
 * DraftSyncManager: the per-server coordinator for synchronized drafts.
 *
 * It owns per-server lifecycle state, a lifecycle epoch that rejects stale async continuations, a
 * bounded inbound WebSocket event buffer, the baseline gate, in-memory absence candidates, and two
 * timers scheduled by scheduleWork: a DRAIN timer (POST/DELETE the outbox, only with a baseline) and
 * a RECONCILE timer (GET the team snapshot to establish/refresh the baseline or run a delayed
 * absence/confirmation observation, only with a known team). Neither timer can form a zero-delay
 * loop: the drain timer requires due Pending work under a baseline, and the reconcile timer always
 * uses a real backoff/confirmation delay.
 *
 * Per-server state is keyed by serverUrl. A server entry is "present" once initialize() (or any
 * scheduling path) has created it. A missing entry is treated as invalidated: no new work is
 * scheduled and captured epochs are considered stale.
 */
class DraftSyncManagerSingleton {
    // lifecycleEpoch: monotonically increasing per server; bumped by invalidate(). A captured
    // epoch that no longer matches (or whose server entry is gone) marks a stale continuation.
    private lifecycleEpoch: Record<string, number> = {};

    // retryTimers: the OUTBOX DRAIN timer (at most one per server). Armed only when a baseline exists
    // and there are due Pending rows in scope; its fire calls drainOutbox. Never armed without a
    // baseline (draining without a baseline would no-op), so it can never form a zero-delay loop.
    private retryTimers: Record<string, ReturnType<typeof setTimeout>> = {};

    // reconcileTimers: the RECONCILE (GET) timer (at most one per server). Armed with a real delay
    // (never 0) to (a) establish a baseline before draining, (b) retry a failed GET with backoff, or
    // (c) run the delayed second observation for confirming-delete tombstones / absence candidates.
    // Requires a known team (baseline.teamId or the last requested team); without one, nothing is armed.
    private reconcileTimers: Record<string, ReturnType<typeof setTimeout>> = {};

    // reconcileAttempt: consecutive failed-GET count per server, driving the reconcile backoff. Reset
    // to 0 on a successful reconcile.
    private reconcileAttempt: Record<string, number> = {};

    // eventBuffers: inbound WebSocket events awaiting Phase 4 draining, bounded by
    // MAX_DRAFT_SYNC_EVENT_BUFFER. Overflowing events are dropped (oldest kept) with a debug log.
    private eventBuffers: Record<string, WebSocketMessage[]> = {};

    // enabled: cached draft-sync capability per server (config AND user preference). false when
    // disabled OR invalidated so no work is scheduled.
    private enabled: Record<string, boolean> = {};

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

    // inFlightKeys: per-server set of outbox keys (buildDraftOutboxId) currently being drained by a
    // worker. Guarantees per-key serialization across overlapping drains (a wake firing while a timer
    // drain runs) so the same row is never POSTed/DELETEd twice concurrently. Cleared on invalidate.
    private inFlightKeys: Record<string, Set<string>> = {};

    // observationOrdinals: per-server map (draftKey -> monotonically increasing counter). A reconcile
    // GET that observes newer content for a key whose POST is in flight bumps its ordinal; the worker
    // captured the ordinal before dispatch and, on ack, refuses to clobber the newer content when it
    // changed. Init in ensureServer, cleared on invalidate; safe to lose (a re-POST re-captures it).
    private observationOrdinals: Record<string, Map<string, number>> = {};

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

        // Interrupted-upload recovery: any WaitingForUpload row survived a process restart with no
        // live upload behind it, so it can never self-complete. Conservatively transition every such
        // row to BlockedUpload('upload_interrupted'); a later genuine edit / upload retry re-activates
        // it. Phase: refine with DraftEditPostUploadManager to only transition rows with no in-progress
        // upload once that manager is reachable from here.
        await this.recoverInterruptedUploads(database);

        // Do NOT arm a drain timer here: there is no baseline yet (draining needs one) and no known
        // team to reconcile until a trigger (requestReconcile) supplies one. scheduleWork therefore
        // arms nothing on a cold start with no team/baseline, which is what prevents a busy loop.
        if (this.enabled[serverUrl]) {
            await this.scheduleWork(serverUrl);
        }
    };

    /**
     * recoverInterruptedUploads: mark every WaitingForUpload outbox row as BlockedUpload with
     * lastErrorCode 'upload_interrupted'. Called once on initialize because a WaitingForUpload row that
     * outlived the process has no live upload behind it. Never throws.
     */
    private recoverInterruptedUploads = async (database: Database): Promise<void> => {
        try {
            const rows = await database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query(
                Q.where('status', DraftOutboxStatus.WaitingForUpload),
            ).fetch();

            if (!rows.length) {
                return;
            }

            const updates = rows.map((row) => row.prepareUpdate((o) => {
                o.status = DraftOutboxStatus.BlockedUpload;
                o.lastErrorCode = 'upload_interrupted';
            }));

            await database.write(async (writer) => {
                await writer.batch(...updates);
            }, 'recoverInterruptedUploads');
        } catch (error) {
            logDebug('DraftSyncManager.recoverInterruptedUploads: query/write failed');
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

        // Fire-and-forget: draining is async (DB + HTTP) but wake() is synchronous by contract. With a
        // baseline established, drain immediately (drainOutbox reschedules via scheduleWork when it
        // ends); without one, let scheduleWork arm a reconcile (only if a team is known) so the work
        // drains once a baseline appears.
        if (this.baseline[serverUrl]) {
            this.drainOutbox(serverUrl);
        } else {
            this.scheduleWork(serverUrl);
        }
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
            res = await reconcileTeamDrafts(serverUrl, teamId, {

                // Fail closed if the server was torn down while the GET was in flight: no snapshot write.
                shouldAbort: () => this.isEpochStale(serverUrl, captured) || !this.isActive(serverUrl),

                // Post-dispatch observation fence: bump the ordinal for every observed key whose POST is
                // in flight, SYNCHRONOUSLY as the GET resolves (before the apply loop). A concurrent ack
                // then sees the change and refuses to clear the outbox / clobber this GET's observation.
                onSnapshot: (keys) => {
                    const inFlight = this.inFlightKeys[serverUrl];
                    if (!inFlight) {
                        return;
                    }
                    for (const {channelId, rootId} of keys) {
                        if (inFlight.has(buildDraftOutboxId(channelId, rootId))) {
                            this.bumpObservation(serverUrl, channelId, rootId);
                        }
                    }
                },
            });
        } catch (error) {
            res = {error};
        }

        // A concurrent invalidate/disable during the await discards this continuation entirely.
        if (this.isEpochStale(serverUrl, captured) || !this.isActive(serverUrl)) {
            this.reconcileInFlight[serverUrl] = false;
            return;
        }

        if (res.error) {
            // Failure: do NOT set a baseline and run NO absence pass (without a snapshot nothing may be
            // deleted). Increment the backoff count; scheduleWork arms a reconcile-GET retry with a real
            // delay (never 0) so a persistently failing GET can never form a busy loop.
            logDebug('DraftSyncManager.reconcile: reconciliation failed', serverUrl);
            this.reconcileAttempt[serverUrl] = (this.reconcileAttempt[serverUrl] ?? 0) + 1;
        } else {
            this.reconcileAttempt[serverUrl] = 0;
            this.baseline[serverUrl] = {teamId, at: Date.now()};

            // (The observation fence for in-flight POSTs is bumped synchronously via onSnapshot above,
            // the moment the GET resolves — not here, which would be after the whole apply loop.)

            // Absence pass: a successful snapshot lets us quarantine/confirm keys that are absent
            // from it. Epoch-guarded internally; it never POSTs/DELETEs over the network.
            await this.runAbsencePass(serverUrl, teamId, res.drafts ?? [], captured);

            // A fresh baseline means queued outbox work can now drain. drainOutbox re-checks epoch and
            // calls scheduleWork when it ends (which re-arms the delayed confirmation reconcile if any
            // confirming-delete/absence candidates remain).
            if (!this.isEpochStale(serverUrl, captured) && this.isActive(serverUrl)) {
                await this.drainOutbox(serverUrl);
            }

            // Missing dependencies: the snapshot referenced channels not yet hydrated, so those keys
            // were skipped. Record a soft attempt so scheduleWork arms a reconcile-GET retry (a real
            // backoff delay, never zero) to re-fetch once dependencies may have hydrated. A subsequent
            // fully-applied reconcile resets the attempt to 0.
            if (res.missingDeps && !this.isEpochStale(serverUrl, captured) && this.isActive(serverUrl)) {
                this.reconcileAttempt[serverUrl] = (this.reconcileAttempt[serverUrl] ?? 0) + 1;
            }
        }

        this.reconcileInFlight[serverUrl] = false;

        // Re-evaluate timers (reconcile backoff on failure; delayed confirmation on success).
        await this.scheduleWork(serverUrl);

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
            // CRITICAL: clear the baseline and absence candidates so re-enabling cannot drain/POST
            // against a stale snapshot — a fresh successful GET is required before draining resumes.
            this.clearRetryTimer(serverUrl);
            this.clearReconcileTimer(serverUrl);
            this.eventBuffers[serverUrl] = [];
            delete this.baseline[serverUrl];
            this.absenceCandidates[serverUrl] = new Map();
            this.reconcileAttempt[serverUrl] = 0;
            logDebug('DraftSyncManager.handleCapabilityChange: disabled', serverUrl);
            return;
        }

        if (!wasEnabled && nowEnabled) {
            // disabled -> enabled: require a fresh baseline before any draining. If a team is known,
            // reconcile now (which will drain on success); otherwise scheduleWork waits for a trigger.
            logDebug('DraftSyncManager.handleCapabilityChange: enabled', serverUrl);
            const teamId = this.lastReconcile[serverUrl]?.teamId;
            if (teamId) {
                this.reconcile(serverUrl, teamId);
            } else {
                await this.scheduleWork(serverUrl);
            }
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
        this.clearReconcileTimer(serverUrl);
        this.eventBuffers[serverUrl] = [];
        this.enabled[serverUrl] = false;
        this.lastReconcile[serverUrl] = {teamId: '', reason: ''};
        delete this.baseline[serverUrl];
        this.reconcileInFlight[serverUrl] = false;
        this.reconcilePending[serverUrl] = undefined;
        this.reconcileAttempt[serverUrl] = 0;
        this.absenceCandidates[serverUrl] = new Map();
        this.inFlightKeys[serverUrl] = new Set();
        this.observationOrdinals[serverUrl] = new Map();
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
     * scheduleWork: the single decider for which timers to arm. Called after initialize, wake,
     * reconcile, and drainOutbox. It arms at most two timers, and never a zero-delay busy loop:
     *
     * - DRAIN timer (retryTimers): only when a baseline exists AND there is a due Pending upsert/delete
     *   row in scope. Its fire drains those rows. A due row fires once, is consumed (removed or backed
     *   off to a future nextAttemptAt), so it cannot re-arm at zero.
     * - RECONCILE timer (reconcileTimers): armed only when a team is known, with a real delay:
     *     (a) failed GET  -> reconcile backoff (>= base);
     *     (b) no baseline but Pending work exists -> base delay, to establish a baseline first;
     *     (c) confirming-delete rows or absence candidates -> DELAY, for the second observation GET.
     *
     * With no baseline and no known team (a cold start before any reconcile trigger), NOTHING is armed.
     */
    private scheduleWork = async (serverUrl: string): Promise<void> => {
        if (!this.isActive(serverUrl)) {
            this.clearRetryTimer(serverUrl);
            this.clearReconcileTimer(serverUrl);
            return;
        }

        const database = this.getDatabase(serverUrl);
        if (!database) {
            this.clearRetryTimer(serverUrl);
            this.clearReconcileTimer(serverUrl);
            return;
        }

        const captured = this.captureEpoch(serverUrl);

        let rows: DraftOutboxModel[];
        try {
            rows = await database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query().fetch();
        } catch (error) {
            logDebug('DraftSyncManager.scheduleWork: outbox query failed', serverUrl);
            return;
        }

        if (this.isEpochStale(serverUrl, captured) || !this.isActive(serverUrl)) {
            return;
        }

        const baseline = this.baseline[serverUrl];
        const teamId = baseline?.teamId || this.lastReconcile[serverUrl]?.teamId || '';
        const inScope = (row: DraftOutboxModel) => row.teamId === teamId || row.teamId === '';
        const isPendingWork = (row: DraftOutboxModel) => row.status === DraftOutboxStatus.Pending &&
            (row.operation === DraftOutboxOperation.Upsert || row.operation === DraftOutboxOperation.Delete);
        const now = Date.now();

        // --- Drain timer ---
        this.clearRetryTimer(serverUrl);
        if (baseline) {
            const pendingDue = rows.filter((r) => inScope(r) && isPendingWork(r));
            if (pendingDue.length) {
                const earliest = Math.min(...pendingDue.map((r) => r.nextAttemptAt));
                this.armDrainTimer(serverUrl, Math.max(0, earliest - now), captured);
            }
        }

        // --- Reconcile timer ---
        this.clearReconcileTimer(serverUrl);
        if (teamId) {
            const attempt = this.reconcileAttempt[serverUrl] ?? 0;
            const hasPendingInScope = rows.some((r) => inScope(r) && isPendingWork(r));
            const hasConfirmingInScope = rows.some((r) => inScope(r) && r.status === DraftOutboxStatus.ConfirmingDelete);
            const hasCandidates = (this.absenceCandidates[serverUrl]?.size ?? 0) > 0;

            let delay: number | undefined;
            if (attempt > 0) {
                delay = this.reconcileBackoffMs(attempt);
            } else if (!baseline && hasPendingInScope) {
                delay = DRAFT_SYNC_RETRY_BASE_MS;
            } else if (hasConfirmingInScope || hasCandidates) {
                delay = DRAFT_ABSENCE_CONFIRMATION_DELAY_MS;
            }

            if (delay !== undefined) {
                this.armReconcileTimer(serverUrl, teamId, delay, captured);
            }
        }
    };

    // armDrainTimer: schedule ONE drain timer; the fire re-checks epoch then drains.
    private armDrainTimer = (serverUrl: string, delay: number, captured: number): void => {
        this.retryTimers[serverUrl] = setTimeout(() => {
            if (this.isEpochStale(serverUrl, captured)) {
                return;
            }
            this.drainOutbox(serverUrl);
        }, delay);
    };

    // armReconcileTimer: schedule ONE reconcile-GET timer; the fire re-checks epoch then reconciles.
    private armReconcileTimer = (serverUrl: string, teamId: string, delay: number, captured: number): void => {
        this.reconcileTimers[serverUrl] = setTimeout(() => {
            if (this.isEpochStale(serverUrl, captured)) {
                return;
            }
            this.reconcile(serverUrl, teamId);
        }, delay);
    };

    // reconcileBackoffMs: capped exponential backoff (attempt 1 -> base) with +/- jitter, for retrying
    // a failed reconciliation GET.
    private reconcileBackoffMs = (attempt: number): number => {
        const capped = Math.min(DRAFT_SYNC_RETRY_BASE_MS * (2 ** (attempt - 1)), DRAFT_SYNC_RETRY_MAX_MS);
        const jitter = 1 + ((Math.random() * 2 * DRAFT_SYNC_RETRY_JITTER) - DRAFT_SYNC_RETRY_JITTER);
        return Math.max(0, Math.round(capped * jitter));
    };

    /**
     * drainOutbox: the write path. Sends eligible Pending outbox rows to the server via the per-key
     * workers, with per-key serialization (inFlightKeys), epoch guarding around each worker, and a
     * heartbeat reschedule when it ends. It performs NO network work until a baseline reconciliation
     * exists for the scope (the exit criterion) — without one it only (re)arms the heartbeat.
     */
    private drainOutbox = async (serverUrl: string): Promise<void> => {
        if (!this.isActive(serverUrl)) {
            return;
        }

        const baseline = this.baseline[serverUrl];
        if (!baseline) {
            // NO draining without a baseline. Defer to scheduleWork, which arms a reconcile-GET (only
            // if a team is known) to establish one; it never arms a zero-delay drain loop.
            await this.scheduleWork(serverUrl);
            return;
        }

        const database = this.getDatabase(serverUrl);
        const inFlight = this.inFlightKeys[serverUrl];
        if (!database || !inFlight) {
            return;
        }

        let rows: DraftOutboxModel[];
        try {
            rows = await database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query(
                Q.where('status', DraftOutboxStatus.Pending),
                Q.where('operation', Q.oneOf([DraftOutboxOperation.Upsert, DraftOutboxOperation.Delete])),
                Q.where('next_attempt_at', Q.lte(Date.now())),
            ).fetch();
        } catch (error) {
            logDebug('DraftSyncManager.drainOutbox: outbox query failed', serverUrl);
            return;
        }

        for (const row of rows) {
            // Scope gate: only this baseline's team, or DM/GM ('' team) rows.
            if (row.teamId !== baseline.teamId && row.teamId !== '') {
                continue;
            }

            // A '' team is a DM/GM scope ONLY. Validate before draining under this arbitrary baseline's
            // team: a row mis-stamped '' for a since-resolved channel must not drain here. Require the
            // channel to be a DM/GM or to have confirmed membership; skip otherwise.
            if (row.teamId === '') {
                // eslint-disable-next-line no-await-in-loop
                const validScope = await this.isDmGmOrMember(database, row.channelId);
                if (!validScope) {
                    // Do NOT bare-continue: the row stays Pending-and-due, so scheduleWork would re-arm a
                    // zero-delay drain that skips it again — a busy loop. Back its next_attempt_at off so
                    // it leaves the due set until its channel/membership may have hydrated (a valid drain
                    // resets the count). The delay caps at DRAFT_SYNC_RETRY_MAX_MS for a truly orphaned row.
                    // eslint-disable-next-line no-await-in-loop
                    await mutateDraftAndOutbox(database, row.channelId, row.rootId, ({outbox: o}) => {
                        if (!o || o.status !== DraftOutboxStatus.Pending) {
                            return [];
                        }
                        return [o.prepareUpdate((x) => {
                            x.attemptCount += 1;
                            x.nextAttemptAt = computeNextAttemptAt(x.attemptCount, Date.now());
                        })];
                    });
                    continue;
                }
            }

            const key = buildDraftOutboxId(row.channelId, row.rootId);
            if (inFlight.has(key)) {
                continue;
            }

            inFlight.add(key);
            const captured = this.captureEpoch(serverUrl);
            const opts: OutboxWorkerOpts = {
                shouldAbort: () => this.isEpochStale(serverUrl, captured) || !this.isActive(serverUrl),
                captureObservation: () => this.getObservation(serverUrl, row.channelId, row.rootId),
                observationChanged: (c: number) => this.getObservation(serverUrl, row.channelId, row.rootId) !== c,
            };

            let outcome: WorkerOutcome;
            try {
                outcome = row.operation === DraftOutboxOperation.Delete ?

                    // eslint-disable-next-line no-await-in-loop
                    await processOutboxDelete(serverUrl, row.channelId, row.rootId, opts) :

                    // eslint-disable-next-line no-await-in-loop
                    await processOutboxUpsert(serverUrl, row.channelId, row.rootId, opts);
            } catch (error) {
                logDebug('DraftSyncManager.drainOutbox: worker threw', serverUrl);
                outcome = {outcome: 'retry'};
            } finally {
                inFlight.delete(key);
            }

            // A concurrent invalidate/disable during the worker discards its result entirely.
            if (this.isEpochStale(serverUrl, captured) || !this.isActive(serverUrl)) {
                return;
            }

            if (outcome.outcome === 'suspend') {
                // Server-wide failure: stop scheduling for this session and drop both timers.
                this.enabled[serverUrl] = false;
                this.clearRetryTimer(serverUrl);
                this.clearReconcileTimer(serverUrl);
                return;
            }
        }

        // Re-evaluate timers: arm the drain timer for the earliest remaining Pending row and, if any
        // confirming-delete/absence work remains, the delayed reconcile GET.
        await this.scheduleWork(serverUrl);
    };

    // clearRetryTimer: cancels and forgets the per-server drain timer if present.
    private clearRetryTimer = (serverUrl: string): void => {
        const timer = this.retryTimers[serverUrl];
        if (timer) {
            clearTimeout(timer);
            delete this.retryTimers[serverUrl];
        }
    };

    // clearReconcileTimer: cancels and forgets the per-server reconcile-GET timer if present.
    private clearReconcileTimer = (serverUrl: string): void => {
        const timer = this.reconcileTimers[serverUrl];
        if (timer) {
            clearTimeout(timer);
            delete this.reconcileTimers[serverUrl];
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
        if (!(serverUrl in this.reconcileInFlight)) {
            this.reconcileInFlight[serverUrl] = false;
        }
        if (!(serverUrl in this.reconcileAttempt)) {
            this.reconcileAttempt[serverUrl] = 0;
        }
        if (!(serverUrl in this.lastReconcile)) {
            this.lastReconcile[serverUrl] = {teamId: '', reason: ''};
        }
        if (!(serverUrl in this.reconcilePending)) {
            this.reconcilePending[serverUrl] = undefined;
        }
        if (!(serverUrl in this.absenceCandidates)) {
            this.absenceCandidates[serverUrl] = new Map();
        }
        if (!(serverUrl in this.inFlightKeys)) {
            this.inFlightKeys[serverUrl] = new Set();
        }
        if (!(serverUrl in this.observationOrdinals)) {
            this.observationOrdinals[serverUrl] = new Map();
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

    // isDmGmOrMember: whether a channel is a valid '' (DM/GM) drain scope — a DM/GM channel, or any
    // channel the current user has a confirmed membership row for.
    private isDmGmOrMember = async (database: Database, channelId: string): Promise<boolean> => {
        const channel = await getChannelById(database, channelId);
        if (channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL) {
            return true;
        }
        return Boolean(await getMyChannel(database, channelId));
    };

    // bumpObservation: increment the per-key observation ordinal (a reconcile GET observed this key).
    private bumpObservation = (serverUrl: string, channelId: string, rootId: string): void => {
        const map = this.observationOrdinals[serverUrl];
        if (!map) {
            return;
        }
        const key = buildDraftOutboxId(channelId, rootId);
        map.set(key, (map.get(key) ?? 0) + 1);
    };

    // getObservation: the current per-key observation ordinal (0 when never observed).
    private getObservation = (serverUrl: string, channelId: string, rootId: string): number => {
        return this.observationOrdinals[serverUrl]?.get(buildDraftOutboxId(channelId, rootId)) ?? 0;
    };
}

const DraftSyncManager = new DraftSyncManagerSingleton();
export default DraftSyncManager;

export const exportedForTesting = {
    DraftSyncManagerSingleton,
};

// ManagerBaselineInternals: narrow view onto the private baseline/single-flight state so tests can
// assert reconciliation bookkeeping without adding production-only accessors.
export type ManagerBaselineInternals = {
    baseline: Record<string, {teamId: string; at: number}>;
    reconcileInFlight: Record<string, boolean>;
    reconcilePending: Record<string, {teamId: string} | undefined>;
    absenceCandidates: Record<string, Map<string, {firstAbsentAt: number; teamId: string}>>;
};
