// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
});
