// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject, of} from 'rxjs';
import {distinctUntilChanged} from 'rxjs/operators';

import {UseInitialLoadEndpoint} from '@assets/config.json';

// Tracks whether channels have been fully fetched for a given (serverUrl, teamId)
// pair during the current process lifetime. Each pair gets its own
// BehaviorSubject<boolean> so components only react to their own team's sync state
// — no cross-team noise.
//
// Intentionally ephemeral: resets on app kill so the blob badge is always shown
// on a fresh cold start until channels are synced from the server.
class ChannelsSyncStoreSingleton {
    private readonly subjects = new Map<string, BehaviorSubject<boolean>>();

    private key(serverUrl: string, teamId: string): string {
        return `${serverUrl}|${teamId}`;
    }

    private getOrCreate(serverUrl: string, teamId: string): BehaviorSubject<boolean> {
        const key = this.key(serverUrl, teamId);
        let subject = this.subjects.get(key);
        if (!subject) {
            subject = new BehaviorSubject<boolean>(false);
            this.subjects.set(key, subject);
        }
        return subject;
    }

    markChannelsFetched(serverUrl: string, teamId: string): void {
        this.getOrCreate(serverUrl, teamId).next(true);
    }

    hasChannelsBeenFetched(serverUrl: string, teamId: string): boolean {
        return this.subjects.get(this.key(serverUrl, teamId))?.getValue() ?? false;
    }

    observeChannelsFetched(serverUrl: string, teamId: string) {
        if (!UseInitialLoadEndpoint) {
            return of(true);
        }
        return this.getOrCreate(serverUrl, teamId).pipe(distinctUntilChanged());
    }

    // Reset all teams for a server — e.g. on logout or server removal.
    clearServer(serverUrl: string): void {
        const prefix = `${serverUrl}|`;
        for (const [key, subject] of this.subjects) {
            if (key.startsWith(prefix)) {
                subject.next(false);
                this.subjects.delete(key);
            }
        }
    }

    // Full reset — e.g. on long background resume to force a fresh blob-first render.
    clearAll(): void {
        for (const subject of this.subjects.values()) {
            subject.next(false);
        }
        this.subjects.clear();
    }
}

const ChannelsSyncStore = new ChannelsSyncStoreSingleton();
export default ChannelsSyncStore;
