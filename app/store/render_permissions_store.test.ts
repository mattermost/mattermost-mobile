// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {advanceTimers} from '@test/timer_helpers';

import type {RenderPermissionsEntry} from './render_permissions_store';

const serverUrl = 'https://server.test';
const otherServerUrl = 'https://other.test';
const channelId = 'channel-id';

const entry: RenderPermissionsEntry = {
    epoch: 3,
    decisions: {upload_file_attachment: {allowed: false, evaluated: true}},
};

describe('RenderPermissionsStore', () => {
    let RenderPermissionsStore: typeof import('./render_permissions_store').default;
    let TTL: number;
    let RETRY: number;

    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.resetModules();
        const module = require('./render_permissions_store');
        RenderPermissionsStore = module.default;
        TTL = module.RENDER_PERMISSIONS_TTL_MS;
        RETRY = module.RENDER_PERMISSIONS_RETRY_MS;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should mark an entry expired once its time to live has passed, keeping its decisions', async () => {
        RenderPermissionsStore.setEntry(serverUrl, channelId, entry, TTL);
        await advanceTimers(TTL);

        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)).toEqual({...entry, expired: true});
    });

    it('should restart the time to live when an entry is replaced', async () => {
        RenderPermissionsStore.setEntry(serverUrl, channelId, entry, TTL);
        await advanceTimers(TTL - 1);

        const next = {...entry, epoch: 4};
        RenderPermissionsStore.setEntry(serverUrl, channelId, next, TTL);
        await advanceTimers(TTL - 1);

        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)).toBe(next);
    });

    it('should emit to a channel observer only when that channel changes', () => {
        const emitted: Array<RenderPermissionsEntry | undefined> = [];
        const subscription = RenderPermissionsStore.observeEntry(serverUrl, channelId).subscribe((e) => emitted.push(e));

        RenderPermissionsStore.setEntry(serverUrl, 'another-channel', entry, TTL);
        RenderPermissionsStore.setEntry(serverUrl, channelId, entry, TTL);

        expect(emitted).toEqual([undefined, entry]);
        subscription.unsubscribe();
    });

    it('should share one in-flight slot per channel', () => {
        const claim = RenderPermissionsStore.startFetch(serverUrl, channelId);
        expect(claim).toBeDefined();
        expect(RenderPermissionsStore.startFetch(serverUrl, channelId)).toBeUndefined();
        expect(RenderPermissionsStore.startFetch(serverUrl, 'another-channel')).toBeDefined();

        RenderPermissionsStore.finishFetch(serverUrl, channelId, claim as object, entry);

        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)).toBe(entry);
        expect(RenderPermissionsStore.startFetch(serverUrl, channelId)).toBeDefined();
    });

    it('should discard an answer whose server was removed, even after the user logged straight back in', () => {
        const oldSession = RenderPermissionsStore.startFetch(serverUrl, channelId);
        RenderPermissionsStore.removeServer(serverUrl);
        const newSession = RenderPermissionsStore.startFetch(serverUrl, channelId);

        RenderPermissionsStore.finishFetch(serverUrl, channelId, oldSession as object, entry);
        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)).toBeUndefined();

        RenderPermissionsStore.finishFetch(serverUrl, channelId, newSession as object, entry);
        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)).toBe(entry);
    });

    it('should expire only the given server in a single emission and revoke its requests in flight on a network change', () => {
        RenderPermissionsStore.setEntry(serverUrl, channelId, entry, TTL);
        RenderPermissionsStore.setEntry(serverUrl, 'second-channel', entry, TTL);
        RenderPermissionsStore.setEntry(otherServerUrl, channelId, entry, TTL);
        const inFlight = RenderPermissionsStore.startFetch(serverUrl, 'another-channel');
        const listener = jest.fn();
        const subscription = RenderPermissionsStore.observeEntry(serverUrl, 'second-channel').subscribe(listener);
        listener.mockClear();

        RenderPermissionsStore.expireServer(serverUrl);

        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)?.expired).toBe(true);
        expect(RenderPermissionsStore.getEntry(serverUrl, 'second-channel')?.expired).toBe(true);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(RenderPermissionsStore.getEntry(otherServerUrl, channelId)?.expired).toBeUndefined();

        // Evaluated for the network the device left, so it is not stored and does not block a new request.
        RenderPermissionsStore.finishFetch(serverUrl, 'another-channel', inFlight as object, entry);
        expect(RenderPermissionsStore.getEntry(serverUrl, 'another-channel')).toBeUndefined();
        expect(RenderPermissionsStore.startFetch(serverUrl, 'another-channel')).toBeDefined();
        subscription.unsubscribe();
    });

    it('should back off exponentially on consecutive transient outcomes, up to the time to live', () => {
        expect(RenderPermissionsStore.nextRetryDelay(serverUrl, channelId)).toBe(RETRY);
        expect(RenderPermissionsStore.nextRetryDelay(serverUrl, channelId)).toBe(RETRY * 2);
        for (let i = 0; i < 10; i++) {
            RenderPermissionsStore.nextRetryDelay(serverUrl, channelId);
        }
        expect(RenderPermissionsStore.nextRetryDelay(serverUrl, channelId)).toBe(TTL);

        RenderPermissionsStore.resetRetryDelay(serverUrl, channelId);
        expect(RenderPermissionsStore.nextRetryDelay(serverUrl, channelId)).toBe(RETRY);
    });

    it('should forget only the given server on removeServer', () => {
        RenderPermissionsStore.setEntry(serverUrl, channelId, entry, TTL);
        RenderPermissionsStore.setEntry(otherServerUrl, channelId, entry, TTL);

        RenderPermissionsStore.removeServer(serverUrl);

        expect(RenderPermissionsStore.getEntry(serverUrl, channelId)).toBeUndefined();
        expect(RenderPermissionsStore.getEntry(otherServerUrl, channelId)).toBe(entry);
    });
});
