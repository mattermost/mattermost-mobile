// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';

import {sendTestNotification} from './notifications';

import type {Client} from '@client/rest';

const mockClient = jest.mocked({
    sendTestNotification: jest.fn(),
} as any as Client);

const serverUrl = 'serverUrl';

beforeAll(() => {
    NetworkManager.getClient = (url) => {
        if (serverUrl === url) {
            return mockClient;
        }
        throw new Error('invalid url');
    };
});

describe('sendTestNotification', () => {
    it('calls client function and returns correctly', async () => {
        mockClient.sendTestNotification.mockResolvedValueOnce({status: 'OK'});
        const result = await sendTestNotification(serverUrl);
        expect(result.status).toBe('OK');
        expect(result.error).toBeUndefined();
        expect(mockClient.sendTestNotification).toHaveBeenCalled();
    });

    it('calls client function and returns correctly when error value', async () => {
        mockClient.sendTestNotification.mockRejectedValueOnce(new Error('some error'));
        const result = await sendTestNotification(serverUrl);
        expect(result.error).toBeTruthy();
        expect(mockClient.sendTestNotification).toHaveBeenCalled();
    });

    it('calls client function and returns error on throw', async () => {
        mockClient.sendTestNotification.mockImplementationOnce(() => {
            throw new Error('error');
        });
        const result = await sendTestNotification(serverUrl);
        expect(result.error).toBeTruthy();
        expect(mockClient.sendTestNotification).toHaveBeenCalled();
    });

    it('show error when wrong server url is used', async () => {
        const result = await sendTestNotification('bad server url');
        expect(result.error).toBeTruthy();
        expect(mockClient.sendTestNotification).not.toHaveBeenCalled();
    });
});
