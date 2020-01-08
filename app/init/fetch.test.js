// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';
import {HEADER_X_VERSION_ID} from 'mattermost-redux/client/client4';

import {
    HEADER_X_CLUSTER_ID,
    HEADER_TOKEN,
} from 'app/init/fetch';

describe('Fetch', () => {
    test('doFetchWithResponse handles empty headers', async () => {
        const setToken = jest.spyOn(Client4, 'setToken');
        const response = {
            json: () => Promise.resolve('data'),
            headers: {},
            ok: true,
        };
        global.fetch.mockReturnValueOnce(response);
        await Client4.doFetchWithResponse('https://mattermost.com', {method: 'GET'});
        expect(Client4.serverVersion).toEqual('');
        expect(Client4.clusterId).toEqual('');
        expect(setToken).not.toHaveBeenCalled();
    });

    test('doFetchWithResponse handles title case headers', async () => {
        const setToken = jest.spyOn(Client4, 'setToken');
        const headers = {
            [HEADER_X_VERSION_ID]: 'VersionId',
            [HEADER_X_CLUSTER_ID]: 'ClusterId',
            [HEADER_TOKEN]: 'Token',
        };
        const response = {
            json: () => Promise.resolve('data'),
            ok: true,
            headers,
        };
        global.fetch.mockReturnValueOnce(response);
        await Client4.doFetchWithResponse('https://mattermost.com', {method: 'GET'});
        expect(Client4.serverVersion).toEqual(headers[HEADER_X_VERSION_ID]);
        expect(Client4.clusterId).toEqual(headers[HEADER_X_CLUSTER_ID]);
        expect(setToken).toHaveBeenCalledWith(headers[HEADER_TOKEN]);
    });

    test('doFetchWithResponse handles lower case headers', async () => {
        const setToken = jest.spyOn(Client4, 'setToken');
        const headers = {
            [HEADER_X_VERSION_ID.toLowerCase()]: 'versionid',
            [HEADER_X_CLUSTER_ID.toLowerCase()]: 'clusterid',
            [HEADER_TOKEN.toLowerCase()]: 'token',
        };
        const response = {
            json: () => Promise.resolve('data'),
            ok: true,
            headers,
        };
        global.fetch.mockReturnValueOnce(response);
        await Client4.doFetchWithResponse('https://mattermost.com', {method: 'GET'});
        expect(Client4.serverVersion).toEqual(headers[HEADER_X_VERSION_ID.toLowerCase()]);
        expect(Client4.clusterId).toEqual(headers[HEADER_X_CLUSTER_ID.toLowerCase()]);
        expect(setToken).toHaveBeenCalledWith(headers[HEADER_TOKEN.toLowerCase()]);
    });
});