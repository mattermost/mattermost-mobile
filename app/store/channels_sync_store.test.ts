// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';
import {take, toArray} from 'rxjs/operators';

jest.mock('@store/ephemeral_store');

describe('ChannelsSyncStore', () => {
    let ChannelsSyncStore: typeof import('./channels_sync_store').default;

    beforeEach(() => {
        jest.resetModules();
        ChannelsSyncStore = require('./channels_sync_store').default;
        const EphemeralStoreMock = require('./ephemeral_store').default;
        EphemeralStoreMock.getExperienceAPIEnabled.mockReturnValue(true);
    });

    const serverUrl = 'https://server.test';
    const otherServerUrl = 'https://other.test';
    const teamA = 'team-a';
    const teamB = 'team-b';

    describe('hasChannelsBeenFetched', () => {
        it('should return false when no mark has been recorded', () => {
            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamA)).toBe(false);
        });

        it('should return true after markChannelsFetched', () => {
            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);

            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamA)).toBe(true);
        });

        it('should track teams independently within the same server', () => {
            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);

            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamA)).toBe(true);
            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamB)).toBe(false);
        });

        it('should track servers independently for the same teamId', () => {
            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);

            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamA)).toBe(true);
            expect(ChannelsSyncStore.hasChannelsBeenFetched(otherServerUrl, teamA)).toBe(false);
        });
    });

    describe('observeChannelsFetched', () => {
        it('should emit false on initial subscribe before any mark', async () => {
            const value = await firstValueFrom(ChannelsSyncStore.observeChannelsFetched(serverUrl, teamA));

            expect(value).toBe(false);
        });

        it('should emit true on initial subscribe after a mark', async () => {
            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);

            const value = await firstValueFrom(ChannelsSyncStore.observeChannelsFetched(serverUrl, teamA));

            expect(value).toBe(true);
        });

        it('should re-emit when markChannelsFetched flips the value', async () => {
            const emissions$ = ChannelsSyncStore.observeChannelsFetched(serverUrl, teamA).pipe(
                take(2),
                toArray(),
            );
            const promise = firstValueFrom(emissions$);

            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);

            await expect(promise).resolves.toEqual([false, true]);
        });

        it('should not re-emit when markChannelsFetched is called twice with the same value (distinctUntilChanged)', () => {
            const callback = jest.fn();
            const subscription = ChannelsSyncStore.observeChannelsFetched(serverUrl, teamA).subscribe(callback);

            // Initial emission.
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith(false);

            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);
            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);

            // Only one additional emission for the true value — the duplicate is filtered out.
            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback).toHaveBeenLastCalledWith(true);

            subscription.unsubscribe();
        });

        it('should observe teams independently', () => {
            const callbackA = jest.fn();
            const callbackB = jest.fn();
            const subA = ChannelsSyncStore.observeChannelsFetched(serverUrl, teamA).subscribe(callbackA);
            const subB = ChannelsSyncStore.observeChannelsFetched(serverUrl, teamB).subscribe(callbackB);

            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);

            expect(callbackA).toHaveBeenLastCalledWith(true);
            expect(callbackB).toHaveBeenLastCalledWith(false);

            subA.unsubscribe();
            subB.unsubscribe();
        });
    });

    describe('clearServer', () => {
        it('should reset only the matching server\'s entries', async () => {
            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);
            ChannelsSyncStore.markChannelsFetched(serverUrl, teamB);
            ChannelsSyncStore.markChannelsFetched(otherServerUrl, teamA);

            ChannelsSyncStore.clearServer(serverUrl);

            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamA)).toBe(false);
            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamB)).toBe(false);
            expect(ChannelsSyncStore.hasChannelsBeenFetched(otherServerUrl, teamA)).toBe(true);
        });

        it('should emit false to subscribers of the cleared server', () => {
            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);
            const callback = jest.fn();
            const subscription = ChannelsSyncStore.observeChannelsFetched(serverUrl, teamA).subscribe(callback);
            callback.mockClear();

            ChannelsSyncStore.clearServer(serverUrl);

            expect(callback).toHaveBeenCalledWith(false);
            subscription.unsubscribe();
        });
    });

    describe('clearAll', () => {
        it('should reset every server and team', () => {
            ChannelsSyncStore.markChannelsFetched(serverUrl, teamA);
            ChannelsSyncStore.markChannelsFetched(otherServerUrl, teamB);

            ChannelsSyncStore.clearAll();

            expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamA)).toBe(false);
            expect(ChannelsSyncStore.hasChannelsBeenFetched(otherServerUrl, teamB)).toBe(false);
        });
    });
});

describe('ChannelsSyncStore with getExperienceAPIEnabled=false', () => {
    let ChannelsSyncStore: typeof import('./channels_sync_store').default;

    beforeEach(() => {
        jest.resetModules();
        ChannelsSyncStore = require('./channels_sync_store').default;
        const EphemeralStoreMock = require('./ephemeral_store').default;
        EphemeralStoreMock.getExperienceAPIEnabled.mockReturnValue(false);
    });

    it('observeChannelsFetched should short-circuit to of(true) regardless of mark state', async () => {
        const value = await firstValueFrom(ChannelsSyncStore.observeChannelsFetched('any-server', 'any-team'));

        expect(value).toBe(true);
    });
});
