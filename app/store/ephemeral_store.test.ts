// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CLASSIFICATION_BANNER_CACHE_TTL} from '@constants/classification';
import {toMilliseconds} from '@utils/datetime';

import EphemeralStore from './ephemeral_store';

describe('EphemeralStore', () => {
    afterEach(() => {
        jest.resetModules();
    });

    it('theme observable', () => {
        const {Preferences} = require('@constants');

        // Initial value should be the default theme
        const initialTheme = EphemeralStore.getTheme();
        expect(initialTheme).toBeDefined();

        // Set theme
        const theme = Preferences.THEMES.denim;
        EphemeralStore.setTheme(theme);
        expect(EphemeralStore.getTheme()).toBe(theme);

        // Observable should emit values
        const mockCallback = jest.fn();
        const subscription = EphemeralStore.observeTheme().subscribe(mockCallback);

        // Should immediately get current value
        expect(mockCallback).toHaveBeenCalledWith(theme);

        // Should get new values when theme changes
        const newTheme = Preferences.THEMES.sapphire;
        EphemeralStore.setTheme(newTheme);
        expect(mockCallback).toHaveBeenCalledWith(newTheme);
        expect(mockCallback).toHaveBeenCalledTimes(2);

        // Clean up
        subscription.unsubscribe();

        // After unsubscribe, callback should not be called
        EphemeralStore.setTheme(theme);
        expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it('playbooks sync', () => {
        // Expect false if not yet set
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url', 'channel-id')).toBe(false);

        // Expect true if set
        EphemeralStore.setChannelPlaybooksSynced('server-url', 'channel-id');
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url', 'channel-id')).toBe(true);

        // Same id, different server
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url-2', 'channel-id')).toBe(false);

        // Set for different server
        EphemeralStore.setChannelPlaybooksSynced('server-url-2', 'channel-id');
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url-2', 'channel-id')).toBe(true);

        // Expect false if cleared
        EphemeralStore.clearChannelPlaybooksSynced('server-url');
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url', 'channel-id')).toBe(false);
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url-2', 'channel-id')).toBe(true); // The other server is not cleared

        // Expect false if unset
        EphemeralStore.setChannelPlaybooksSynced('server-url', 'channel-id');
        EphemeralStore.setChannelPlaybooksSynced('server-url', 'channel-id-2');
        EphemeralStore.setChannelPlaybooksSynced('server-url', 'channel-id-3');

        EphemeralStore.unsetChannelPlaybooksSynced('server-url', 'channel-id');
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url', 'channel-id')).toBe(false);
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url', 'channel-id-2')).toBe(true);
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url', 'channel-id-3')).toBe(true);

        // Expect false if cleared
        EphemeralStore.clearChannelPlaybooksSynced('server-url');
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url', 'channel-id')).toBe(false);
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url', 'channel-id-2')).toBe(false);
        expect(EphemeralStore.getChannelPlaybooksSynced('server-url', 'channel-id-3')).toBe(false);
    });

    describe('classification banner cache', () => {
        const serverUrl = 'classification-server';
        const otherServerUrl = 'classification-server-2';

        afterEach(() => {
            EphemeralStore.clearClassificationCache(serverUrl);
            EphemeralStore.clearClassificationCache(otherServerUrl);
            jest.useRealTimers();
        });

        it('should need a fetch until marked, then respect the TTL', () => {
            jest.useFakeTimers({doNotFake: ['nextTick']});

            expect(EphemeralStore.shouldFetchClassificationBanner(serverUrl)).toBe(true);

            EphemeralStore.setClassificationBannerFetched(serverUrl);
            expect(EphemeralStore.shouldFetchClassificationBanner(serverUrl)).toBe(false);

            jest.advanceTimersByTime(CLASSIFICATION_BANNER_CACHE_TTL);
            expect(EphemeralStore.shouldFetchClassificationBanner(serverUrl)).toBe(true);
        });

        it('should track freshness independently per server', () => {
            EphemeralStore.setClassificationBannerFetched(serverUrl);
            expect(EphemeralStore.shouldFetchClassificationBanner(serverUrl)).toBe(false);
            expect(EphemeralStore.shouldFetchClassificationBanner(otherServerUrl)).toBe(true);
        });

        it('should guard field sync attempts scoped per server and option', () => {
            expect(EphemeralStore.getClassificationFieldSyncAttempted(serverUrl, 'opt-1')).toBe(false);

            EphemeralStore.setClassificationFieldSyncAttempted(serverUrl, 'opt-1');
            expect(EphemeralStore.getClassificationFieldSyncAttempted(serverUrl, 'opt-1')).toBe(true);
            expect(EphemeralStore.getClassificationFieldSyncAttempted(serverUrl, 'opt-2')).toBe(false);
            expect(EphemeralStore.getClassificationFieldSyncAttempted(otherServerUrl, 'opt-1')).toBe(false);
        });

        it('should reset both freshness and the field sync guard on clearClassificationCache', () => {
            EphemeralStore.setClassificationBannerFetched(serverUrl);
            EphemeralStore.setClassificationFieldSyncAttempted(serverUrl, 'opt-1');

            EphemeralStore.clearClassificationCache(serverUrl);

            expect(EphemeralStore.shouldFetchClassificationBanner(serverUrl)).toBe(true);
            expect(EphemeralStore.getClassificationFieldSyncAttempted(serverUrl, 'opt-1')).toBe(false);
        });
    });

    describe('recently unsaved saved posts', () => {
        const serverUrl = 'server-url';
        const otherServerUrl = 'server-url-2';
        const postId = 'post-id';

        beforeEach(() => {
            jest.useFakeTimers({doNotFake: ['nextTick']});
        });

        afterEach(() => {
            // Clear any pending timers so they don't leak across tests
            EphemeralStore.clearRecentlyUnsavedSavedPost(serverUrl, postId);
            EphemeralStore.clearRecentlyUnsavedSavedPost(otherServerUrl, postId);
            jest.useRealTimers();
        });

        it('marks a post as recently unsaved and isolates by server', () => {
            expect(EphemeralStore.isRecentlyUnsavedSavedPost(serverUrl, postId)).toBe(false);

            EphemeralStore.addRecentlyUnsavedSavedPost(serverUrl, postId);
            expect(EphemeralStore.isRecentlyUnsavedSavedPost(serverUrl, postId)).toBe(true);

            // A different server with the same postId is unaffected
            expect(EphemeralStore.isRecentlyUnsavedSavedPost(otherServerUrl, postId)).toBe(false);
        });

        it('clears the flag automatically after the TTL', () => {
            EphemeralStore.addRecentlyUnsavedSavedPost(serverUrl, postId);
            expect(EphemeralStore.isRecentlyUnsavedSavedPost(serverUrl, postId)).toBe(true);

            jest.advanceTimersByTime(toMilliseconds({minutes: 2}));
            expect(EphemeralStore.isRecentlyUnsavedSavedPost(serverUrl, postId)).toBe(false);
        });

        it('clearRecentlyUnsavedSavedPost cancels the pending TTL immediately', () => {
            EphemeralStore.addRecentlyUnsavedSavedPost(serverUrl, postId);
            expect(EphemeralStore.isRecentlyUnsavedSavedPost(serverUrl, postId)).toBe(true);

            EphemeralStore.clearRecentlyUnsavedSavedPost(serverUrl, postId);
            expect(EphemeralStore.isRecentlyUnsavedSavedPost(serverUrl, postId)).toBe(false);
        });

        it('observeRecentlyUnsavedSavedPost emits the unsaved state changes', () => {
            const mockCallback = jest.fn();
            const subscription = EphemeralStore.observeRecentlyUnsavedSavedPost(serverUrl, postId).subscribe(mockCallback);

            // Immediately gets the current (false) value
            expect(mockCallback).toHaveBeenCalledWith(false);

            EphemeralStore.addRecentlyUnsavedSavedPost(serverUrl, postId);
            expect(mockCallback).toHaveBeenCalledWith(true);

            // After the TTL expires it should emit false again
            jest.advanceTimersByTime(toMilliseconds({minutes: 2}));
            expect(mockCallback).toHaveBeenLastCalledWith(false);

            subscription.unsubscribe();
        });

        it('observeRecentlyUnsavedSavedPosts emits the set of unsaved posts', () => {
            const mockCallback = jest.fn();
            const subscription = EphemeralStore.observeRecentlyUnsavedSavedPosts(serverUrl).subscribe(mockCallback);

            EphemeralStore.addRecentlyUnsavedSavedPost(serverUrl, postId);
            EphemeralStore.addRecentlyUnsavedSavedPost(serverUrl, 'post-id-2');

            const calls = mockCallback.mock.calls;
            const lastSet = calls[calls.length - 1][0] as Set<string>;
            expect(lastSet.size).toBe(2);
            expect(lastSet.has(postId)).toBe(true);
            expect(lastSet.has('post-id-2')).toBe(true);

            EphemeralStore.clearRecentlyUnsavedSavedPost(serverUrl, 'post-id-2');
            const afterClearSet = calls[calls.length - 1][0] as Set<string>;
            expect(afterClearSet.size).toBe(1);
            expect(afterClearSet.has(postId)).toBe(true);
            expect(afterClearSet.has('post-id-2')).toBe(false);

            subscription.unsubscribe();
        });
    });
});
