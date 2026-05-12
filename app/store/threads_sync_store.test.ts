// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';
import {take, toArray} from 'rxjs/operators';

jest.mock('@assets/config.json', () => ({
    UseInitialLoadEndpoint: true,
}));

describe('ThreadsSyncStore', () => {
    let ThreadsSyncStore: typeof import('./threads_sync_store').default;

    beforeEach(() => {
        jest.resetModules();
        ThreadsSyncStore = require('./threads_sync_store').default;
    });

    const serverUrl = 'https://server.test';
    const otherServerUrl = 'https://other.test';
    const teamA = 'team-a';
    const teamB = 'team-b';

    describe('hasThreadsBeenFetched', () => {
        it('should return false when no mark has been recorded', () => {
            expect(ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamA)).toBe(false);
        });

        it('should return true after markThreadsFetched', () => {
            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);

            expect(ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamA)).toBe(true);
        });

        it('should track teams independently within the same server', () => {
            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);

            expect(ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamA)).toBe(true);
            expect(ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamB)).toBe(false);
        });

        it('should track servers independently for the same teamId', () => {
            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);

            expect(ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamA)).toBe(true);
            expect(ThreadsSyncStore.hasThreadsBeenFetched(otherServerUrl, teamA)).toBe(false);
        });
    });

    describe('observeThreadsFetched', () => {
        it('should emit false on initial subscribe before any mark', async () => {
            const value = await firstValueFrom(ThreadsSyncStore.observeThreadsFetched(serverUrl, teamA));

            expect(value).toBe(false);
        });

        it('should emit true on initial subscribe after a mark', async () => {
            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);

            const value = await firstValueFrom(ThreadsSyncStore.observeThreadsFetched(serverUrl, teamA));

            expect(value).toBe(true);
        });

        it('should re-emit when markThreadsFetched flips the value', async () => {
            const emissions$ = ThreadsSyncStore.observeThreadsFetched(serverUrl, teamA).pipe(
                take(2),
                toArray(),
            );
            const promise = firstValueFrom(emissions$);

            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);

            await expect(promise).resolves.toEqual([false, true]);
        });

        it('should not re-emit when markThreadsFetched is called twice with the same value (distinctUntilChanged)', () => {
            const callback = jest.fn();
            const subscription = ThreadsSyncStore.observeThreadsFetched(serverUrl, teamA).subscribe(callback);

            // Initial emission.
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(false);

            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);
            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);

            // Only one additional emission for the true value — the duplicate is filtered out.
            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback).toHaveBeenLastCalledWith(true);

            subscription.unsubscribe();
        });

        it('should observe teams independently', () => {
            const callbackA = jest.fn();
            const callbackB = jest.fn();
            const subA = ThreadsSyncStore.observeThreadsFetched(serverUrl, teamA).subscribe(callbackA);
            const subB = ThreadsSyncStore.observeThreadsFetched(serverUrl, teamB).subscribe(callbackB);

            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);

            expect(callbackA).toHaveBeenLastCalledWith(true);
            expect(callbackB).toHaveBeenLastCalledWith(false);

            subA.unsubscribe();
            subB.unsubscribe();
        });
    });

    describe('clearServer', () => {
        it('should reset only the matching server\'s entries', () => {
            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);
            ThreadsSyncStore.markThreadsFetched(serverUrl, teamB);
            ThreadsSyncStore.markThreadsFetched(otherServerUrl, teamA);

            ThreadsSyncStore.clearServer(serverUrl);

            expect(ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamA)).toBe(false);
            expect(ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamB)).toBe(false);
            expect(ThreadsSyncStore.hasThreadsBeenFetched(otherServerUrl, teamA)).toBe(true);
        });

        it('should emit false to subscribers of the cleared server', () => {
            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);
            const callback = jest.fn();
            const subscription = ThreadsSyncStore.observeThreadsFetched(serverUrl, teamA).subscribe(callback);
            callback.mockClear();

            ThreadsSyncStore.clearServer(serverUrl);

            expect(callback).toHaveBeenCalledWith(false);
            subscription.unsubscribe();
        });
    });

    describe('clearAll', () => {
        it('should reset every server and team', () => {
            ThreadsSyncStore.markThreadsFetched(serverUrl, teamA);
            ThreadsSyncStore.markThreadsFetched(otherServerUrl, teamB);

            ThreadsSyncStore.clearAll();

            expect(ThreadsSyncStore.hasThreadsBeenFetched(serverUrl, teamA)).toBe(false);
            expect(ThreadsSyncStore.hasThreadsBeenFetched(otherServerUrl, teamB)).toBe(false);
        });
    });
});

describe('ThreadsSyncStore with UseInitialLoadEndpoint=false', () => {
    let ThreadsSyncStore: typeof import('./threads_sync_store').default;

    beforeEach(() => {
        jest.resetModules();
        jest.doMock('@assets/config.json', () => ({UseInitialLoadEndpoint: false}));
        ThreadsSyncStore = require('./threads_sync_store').default;
    });

    afterEach(() => {
        jest.dontMock('@assets/config.json');
    });

    it('observeThreadsFetched should short-circuit to of(true) regardless of mark state', async () => {
        const value = await firstValueFrom(ThreadsSyncStore.observeThreadsFetched('any-server', 'any-team'));

        expect(value).toBe(true);
    });
});
