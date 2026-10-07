// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject, type Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

export type RenderPermissionsEntry = {

    // Redaction epoch counter captured when the request was dispatched. Once the channel's required
    // epoch moves past it the entry is due for revalidation, so every ABAC invalidation reaches it.
    epoch: number;
    decisions: Record<string, RenderPermissionDecision>;

    // Past its time to live, or taken on a network the device has since left. Still rendered until the
    // revalidation lands, so a control does not flip to its default and back on every refresh.
    expired?: boolean;
};

// Websocket delivery is not guaranteed, so no entry is trusted indefinitely. Revalidation is also
// triggered by any redaction epoch raise (see @actions/websocket/access_control), a network change
// (expireServer from WebsocketManager), the server refusing an upload the entry allowed, and the entry
// is dropped on logout or server removal.
export const RENDER_PERMISSIONS_TTL_MS = 5 * 60 * 1000;

// First delay after an outcome that says nothing about the policy: a failed request, or a fail-closed
// deny returned because evaluation itself failed. Doubles on each consecutive one, up to the TTL.
export const RENDER_PERMISSIONS_RETRY_MS = 15 * 1000;

// Identifies one request, so an answer can be matched to the claim it was sent under.
type FetchClaim = object;

class RenderPermissionsStoreSingleton {
    private entries: {[serverUrl: string]: BehaviorSubject<Map<string, RenderPermissionsEntry>>} = {};
    private expiries: {[serverUrl: string]: Map<string, ReturnType<typeof setTimeout>>} = {};
    private claims: {[serverUrl: string]: Map<string, FetchClaim>} = {};
    private transientFailures: {[serverUrl: string]: Map<string, number>} = {};

    private getSubject = (serverUrl: string) => {
        if (!this.entries[serverUrl]) {
            this.entries[serverUrl] = new BehaviorSubject(new Map());
        }
        return this.entries[serverUrl];
    };

    private clearExpiry = (serverUrl: string, channelId: string) => {
        const timeout = this.expiries[serverUrl]?.get(channelId);
        if (timeout) {
            clearTimeout(timeout);
            this.expiries[serverUrl].delete(channelId);
        }
    };

    /**
     * Marks a channel's entry due for revalidation, keeping its decisions on screen until it lands.
     * Used when the server refuses an action the entry allowed.
     */
    expireEntry = (serverUrl: string, channelId: string) => {
        this.clearExpiry(serverUrl, channelId);

        const subject = this.entries[serverUrl];
        const entry = subject?.value.get(channelId);
        if (!entry || entry.expired) {
            return;
        }
        const next = new Map(subject.value);
        next.set(channelId, {...entry, expired: true});
        subject.next(next);
    };

    observeEntry = (serverUrl: string, channelId: string): Observable<RenderPermissionsEntry | undefined> => {
        return this.getSubject(serverUrl).pipe(
            map((entries) => entries.get(channelId)),
            distinctUntilChanged(),
        );
    };

    getEntry = (serverUrl: string, channelId: string) => {
        return this.entries[serverUrl]?.value.get(channelId);
    };

    setEntry = (serverUrl: string, channelId: string, entry: RenderPermissionsEntry, ttlMs: number) => {
        this.clearExpiry(serverUrl, channelId);

        const subject = this.getSubject(serverUrl);
        const next = new Map(subject.value);
        next.set(channelId, entry);
        subject.next(next);

        if (!this.expiries[serverUrl]) {
            this.expiries[serverUrl] = new Map();
        }
        this.expiries[serverUrl].set(channelId, setTimeout(() => this.expireEntry(serverUrl, channelId), ttlMs));
    };

    /**
     * Claims the request slot for a channel. Undefined when a request for it is already in flight, so
     * concurrent composers (a channel and a thread of it) or quick remounts share one request.
     */
    startFetch = (serverUrl: string, channelId: string): FetchClaim | undefined => {
        if (!this.claims[serverUrl]) {
            this.claims[serverUrl] = new Map();
        }
        if (this.claims[serverUrl].has(channelId)) {
            return undefined;
        }
        const claim = {};
        this.claims[serverUrl].set(channelId, claim);
        return claim;
    };

    /**
     * Releases the slot and stores the outcome, unless the claim was revoked while the request was in
     * flight: by a network change (the answer was evaluated for the old network) or by the server being
     * removed (it belongs to a session that no longer exists, even if the user logged straight back in).
     * The slot is released before storing, so an answer that is already stale can be refetched at once.
     */
    finishFetch = (serverUrl: string, channelId: string, claim: FetchClaim, entry?: RenderPermissionsEntry, ttlMs = RENDER_PERMISSIONS_TTL_MS) => {
        if (this.claims[serverUrl]?.get(channelId) !== claim) {
            return;
        }
        this.claims[serverUrl].delete(channelId);
        if (entry) {
            this.setEntry(serverUrl, channelId, entry, ttlMs);
        }
    };

    /**
     * Counts a consecutive outcome that said nothing about the policy and returns how long to wait
     * before asking again.
     */
    nextRetryDelay = (serverUrl: string, channelId: string) => {
        if (!this.transientFailures[serverUrl]) {
            this.transientFailures[serverUrl] = new Map();
        }
        const failures = (this.transientFailures[serverUrl].get(channelId) ?? 0) + 1;
        this.transientFailures[serverUrl].set(channelId, failures);
        return Math.min(RENDER_PERMISSIONS_RETRY_MS * (2 ** (failures - 1)), RENDER_PERMISSIONS_TTL_MS);
    };

    resetRetryDelay = (serverUrl: string, channelId: string) => {
        this.transientFailures[serverUrl]?.delete(channelId);
    };

    /**
     * Network session attributes (SSID, VPN, interface, IP) are part of the ABAC subject and follow the
     * device's network, so a network change can flip any decision on a server that collects them.
     * Requests in flight were evaluated for the previous network, so their claims are revoked too.
     */
    expireServer = (serverUrl: string) => {
        for (const timeout of this.expiries[serverUrl]?.values() ?? []) {
            clearTimeout(timeout);
        }
        this.expiries[serverUrl]?.clear();
        this.claims[serverUrl]?.clear();

        const subject = this.entries[serverUrl];
        if (!subject) {
            return;
        }

        // One emission for the whole server rather than one per channel.
        const next = new Map<string, RenderPermissionsEntry>();
        for (const [channelId, entry] of subject.value) {
            next.set(channelId, entry.expired ? entry : {...entry, expired: true});
        }
        subject.next(next);
    };

    removeServer = (serverUrl: string) => {
        for (const timeout of this.expiries[serverUrl]?.values() ?? []) {
            clearTimeout(timeout);
        }
        delete this.expiries[serverUrl];
        delete this.claims[serverUrl];
        delete this.transientFailures[serverUrl];

        // Emptied before it is dropped, so a subscriber still attached stops trusting its entry.
        const subject = this.entries[serverUrl];
        delete this.entries[serverUrl];
        subject?.next(new Map());
    };
}

const RenderPermissionsStore = new RenderPermissionsStoreSingleton();
export default RenderPermissionsStore;
