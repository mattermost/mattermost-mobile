// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoCellularGeneration, NetInfoStateType, type NetInfoState} from '@react-native-community/netinfo';

import {logInfo} from '@utils/log';

import {type FeatureGates, type NetworkPosture, getFeatureGates} from './gates';

type LinkHints = {
    metered: boolean;
    cellular: boolean;
    lowBandwidth: boolean;
};

type ServerState = {
    rttEwmaMs: number;
    consecutiveBad: number;
    published: NetworkPosture;
    upgradeStreak: number;
    lastSampleAt: number;
    lastLogged: NetworkPosture;
    rateLimitedUntil: number;
    inflight: Map<number, number>;
};

const FAIR_DOWN_MS = 500;
const CONGESTED_DOWN_MS = 1200;
const CELLULAR_FAIR_MS = 300;
const EWMA_ALPHA = 0.3;
const UPGRADE_SAMPLES = 3;
const SAMPLE_STALE_MS = 60_000;
const RATE_LIMIT_DEFAULT_MS = 1_000;
const RATE_LIMIT_MAX_WINDOW_MS = 60_000;

const SEVERITY: Record<NetworkPosture, number> = {
    offline: 0,
    congested: 1,
    fair: 2,
    unknown: 2,
    good: 3,
};

const worse = (a: NetworkPosture, b: NetworkPosture) => (SEVERITY[a] <= SEVERITY[b] ? a : b);

export const boundedRateLimitHoldMs = (retryAfterMs?: number) => {
    if (retryAfterMs && retryAfterMs > 0) {
        return Math.min(retryAfterMs, RATE_LIMIT_MAX_WINDOW_MS);
    }
    return RATE_LIMIT_DEFAULT_MS;
};

const hintsFromNetInfo = (state: NetInfoState): LinkHints => {
    const cellular = state.type === NetInfoStateType.cellular;
    return {
        metered: Boolean(state.details && 'isConnectionExpensive' in state.details && state.details.isConnectionExpensive),
        cellular,
        lowBandwidth: cellular && state.details?.cellularGeneration === NetInfoCellularGeneration['2g'],
    };
};

class NetworkPostureManagerSingleton {
    private servers: Record<string, ServerState> = {};
    private online = true;
    private netType: NetInfoStateType = NetInfoStateType.unknown;
    private hints: LinkHints = {metered: false, cellular: false, lowBandwidth: false};
    private nextRequestId = 1;

    constructor() {
        NetInfo.addEventListener(this.onNetInfoChange);
    }

    public beginRequest = (serverUrl: string) => {
        const id = this.nextRequestId++;
        this.getState(serverUrl).inflight.set(id, Date.now());
        return id;
    };

    public endRequest = (serverUrl: string, id: number) => {
        this.servers[serverUrl]?.inflight.delete(id);
    };

    /**
     * Records one completed REST round-trip or WebSocket ping. `bad` is a transport
     * failure; an HTTP error response still proves the link and is not bad.
     */
    public recordSample = (serverUrl: string, elapsedMs: number, bad: boolean) => {
        const state = this.getState(serverUrl);
        state.lastSampleAt = Date.now();
        if (bad) {
            state.consecutiveBad += 1;
        } else {
            state.consecutiveBad = 0;
            state.rttEwmaMs = state.rttEwmaMs ? Math.round((state.rttEwmaMs * (1 - EWMA_ALPHA)) + (elapsedMs * EWMA_ALPHA)) : elapsedMs;
        }
        this.recompute(serverUrl, state);
    };

    public noteRateLimited = (serverUrl: string, retryAfterMs?: number) => {
        const state = this.getState(serverUrl);
        state.rateLimitedUntil = Math.max(state.rateLimitedUntil, Date.now() + boundedRateLimitHoldMs(retryAfterMs));
        this.recompute(serverUrl, state);
    };

    public getPosture = (serverUrl: string): NetworkPosture => {
        if (!this.online) {
            return 'offline';
        }

        const state = this.servers[serverUrl];
        if (!state) {
            return this.applyLinkHints('unknown', 0, undefined);
        }

        let posture: NetworkPosture;
        if (this.inflightForcesCongested(state)) {
            posture = 'congested';
        } else if (state.lastSampleAt && Date.now() - state.lastSampleAt > SAMPLE_STALE_MS) {
            // Idle sessions must not stay pinned at Good forever.
            posture = this.applyLinkHints('unknown', 0, state);
            state.published = posture;
            state.upgradeStreak = 0;
        } else {
            posture = state.published === 'unknown' ? this.rawPosture(state) : state.published;
        }

        this.logTransition(serverUrl, state, posture);
        return posture;
    };

    public getGates = (serverUrl: string): FeatureGates => {
        return getFeatureGates(this.getPosture(serverUrl));
    };

    public removeServer = (serverUrl: string) => {
        delete this.servers[serverUrl];
    };

    private onNetInfoChange = (state: NetInfoState) => {
        const online = state.isConnected !== false;
        const linkChanged = online !== this.online || state.type !== this.netType;
        this.online = online;
        this.netType = state.type;
        this.hints = hintsFromNetInfo(state);

        // Samples from a previous link say nothing about the new one.
        if (linkChanged) {
            this.servers = {};
            return;
        }
        for (const [serverUrl, server] of Object.entries(this.servers)) {
            this.recompute(serverUrl, server);
        }
    };

    private getState = (serverUrl: string) => {
        if (!this.servers[serverUrl]) {
            this.servers[serverUrl] = {
                rttEwmaMs: 0,
                consecutiveBad: 0,
                published: 'unknown',
                upgradeStreak: 0,
                lastSampleAt: 0,
                lastLogged: 'unknown',
                rateLimitedUntil: 0,
                inflight: new Map(),
            };
        }
        return this.servers[serverUrl];
    };

    private inflightForcesCongested = (state: ServerState) => {
        const now = Date.now();
        for (const startedAt of state.inflight.values()) {
            if (now - startedAt >= CONGESTED_DOWN_MS) {
                return true;
            }
        }
        return false;
    };

    private rawPosture = (state: ServerState): NetworkPosture => {
        if (state.consecutiveBad > 0) {
            return 'congested';
        }

        const rtt = state.rttEwmaMs;
        let posture: NetworkPosture = 'good';
        if (!rtt) {
            posture = 'unknown';
        } else if (rtt > CONGESTED_DOWN_MS) {
            posture = 'congested';
        } else if (rtt > FAIR_DOWN_MS) {
            posture = 'fair';
        }
        return this.applyLinkHints(posture, rtt, state);
    };

    private applyLinkHints = (posture: NetworkPosture, rtt: number, state: ServerState | undefined): NetworkPosture => {
        let p = posture;
        if (this.hints.metered && p === 'good') {
            p = 'fair';
        }
        if (this.hints.cellular && rtt > CELLULAR_FAIR_MS && p === 'good') {
            p = 'fair';
        }
        if (this.hints.lowBandwidth) {
            p = worse(p, 'congested');
        }
        if (state && Date.now() < state.rateLimitedUntil) {
            p = worse(p, 'congested');
        }
        return p;
    };

    // Downgrade is immediate; upgrading needs UPGRADE_SAMPLES consecutive better samples.
    private recompute = (serverUrl: string, state: ServerState) => {
        const raw = this.rawPosture(state);
        const published = state.published;
        let next = published;
        if (published === 'unknown') {
            next = raw;
        } else if (SEVERITY[raw] < SEVERITY[published]) {
            state.upgradeStreak = 0;
            next = raw;
        } else if (SEVERITY[raw] > SEVERITY[published]) {
            state.upgradeStreak += 1;
            if (state.upgradeStreak >= UPGRADE_SAMPLES) {
                state.upgradeStreak = 0;
                next = raw;
            }
        } else {
            state.upgradeStreak = 0;
        }
        state.published = next;
        this.logTransition(serverUrl, state, next);
    };

    private logTransition = (serverUrl: string, state: ServerState, posture: NetworkPosture) => {
        if (state.lastLogged !== posture) {
            logInfo('NetworkPostureManager: posture changed', serverUrl, state.lastLogged, '->', posture, 'rtt', state.rttEwmaMs);
            state.lastLogged = posture;
        }
    };
}

export const testExports = {
    NetworkPostureManagerSingleton,
    CONGESTED_DOWN_MS,
    SAMPLE_STALE_MS,
};

const NetworkPostureManager = new NetworkPostureManagerSingleton();
export default NetworkPostureManager;
