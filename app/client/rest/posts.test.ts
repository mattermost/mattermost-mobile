// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client} from '.';

import type {APIClientInterface} from '@mattermost/react-native-network-client';

const mockAPIClient = {
    post: jest.fn(),
} as any as APIClientInterface;

describe('sendTestNotification', () => {
    it('fetch the correct url with the correct method', () => {
        const client = new Client(mockAPIClient, 'serverUrl');
        client.sendTestNotification();
        expect(mockAPIClient.post).toHaveBeenCalledWith('/api/v4/notifications/test', expect.anything());
    });
});
