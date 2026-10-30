// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getOrCreateAPIClient} from '@mattermost/react-native-network-client';

import * as ClientConstants from '@client/rest/constants';

import NetworkManager from './network_manager';

describe('NetworkManager.createClient', () => {
    it('should send the preauth secret header for an https server', async () => {
        await NetworkManager.createClient('https://example.com', 'token', 'secret');

        const config = jest.mocked(getOrCreateAPIClient).mock.lastCall?.[1];
        expect(config?.headers?.[ClientConstants.HEADER_X_MATTERMOST_PREAUTH_SECRET]).toBe('secret');
    });

    it('should not send the preauth secret header for an http server', async () => {
        await NetworkManager.createClient('http://example.com', 'token', 'secret');

        const config = jest.mocked(getOrCreateAPIClient).mock.lastCall?.[1];
        expect(config?.headers).not.toHaveProperty(ClientConstants.HEADER_X_MATTERMOST_PREAUTH_SECRET);
    });
});
