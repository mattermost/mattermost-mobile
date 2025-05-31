// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {mockApiClient} from '@test/mock_api_client';

import {sendPerformanceReport} from './performance';

describe('sendPerformanceReport', () => {
    const serverUrl = 'http://www.someserverurl.com';
    const report: PerformanceReport = {
        counters: [],
        start: 1234,
        end: 1235,
        histograms: [
            {
                metric: 'metric1',
                timestamp: 1234,
                value: 123,
            },
            {
                metric: 'metric1',
                timestamp: 1234,
                value: 124,
            },
            {
                metric: 'metric2',
                timestamp: 1234,
                value: 125,
            },
        ],
        labels: {
            agent: 'rnapp',
            platform: 'ios',
        },
        version: '0.1.0',
    };

    beforeAll(() => {
        mockApiClient.post.mockImplementation(() => ({status: 200, ok: true}));
    });

    afterAll(() => {
        mockApiClient.post.mockReset();
    });

    beforeEach(async () => {
        const client = await NetworkManager.createClient(serverUrl);
        expect(client).toBeTruthy();
    });

    afterEach(async () => {
        NetworkManager.invalidateClient(serverUrl);
    });

    it('happy path', async () => {
        const {error} = await sendPerformanceReport(serverUrl, report);
        expect(error).toBeFalsy();
        expect(mockApiClient.post).toHaveBeenCalledWith(`${serverUrl}/api/v4/client_perf`, {body: report, headers: {Accept: 'application/json'}});
    });

    it('properly returns error', async () => {
        mockApiClient.post.mockImplementationOnce(() => ({status: 404, ok: false}));
        const {error} = await sendPerformanceReport(serverUrl, report);
        expect(error).toBeTruthy();
    });
});
