// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

describe('EphemeralStore', () => {
    afterEach(() => {
        jest.resetModules();
    });

    it('playbooks sync', () => {
        const EphemeralStore = require('./ephemeral_store').default;

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
    });
});
