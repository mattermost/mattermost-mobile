// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {mockApiClient} from '@test/mock_api_client';
import TestHelper from '@test/test_helper';

import Batcher from './performance_metrics_batcher';
import {getBaseReportRequest} from './test_utils';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@utils/log', () => ({
    logDebug: () => '',
}));

describe('perfromance metrics batcher', () => {
    const serverUrl = 'http://www.someserverurl.com';
    const expectedUrl = `${serverUrl}/api/v4/client_perf`;

    const measure1: PerformanceReportMeasure = {
        metric: 'someMetric',
        timestamp: 1234,
        value: 1.5,
    };
    let operator: ServerDataOperator;

    const measure2: PerformanceReportMeasure = {
        metric: 'someOtherMetric',
        timestamp: 1235,
        value: 2.5,
    };

    const measure3: PerformanceReportMeasure = {
        metric: 'yetAnother',
        timestamp: 1236,
        value: 0.5,
    };

    async function setMetricsConfig(value: string) {
        await operator.handleConfigs({configs: [{id: 'EnableClientMetrics', value}], configsToDelete: [], prepareRecordsOnly: false});
    }

    beforeEach(async () => {
        NetworkManager.createClient(serverUrl);
        operator = (await TestHelper.setupServerDatabase(serverUrl)).operator;
        await setMetricsConfig('true');
        jest.useFakeTimers({doNotFake: [
            'Date',
            'cancelAnimationFrame',
            'cancelIdleCallback',
            'clearImmediate',
            'clearInterval',
            'clearTimeout',
            'hrtime',
            'nextTick',
            'performance',
            'queueMicrotask',
            'requestAnimationFrame',
            'requestIdleCallback',
            'setImmediate',
            'setInterval',
        ]});
    });
    afterEach(async () => {
        jest.useRealTimers();
        NetworkManager.invalidateClient(serverUrl);
        await TestHelper.tearDown();
    });

    it('properly send batches only after timeout', async () => {
        const batcher = new Batcher(serverUrl);

        const expectedRequest = getBaseReportRequest(measure1.timestamp, measure2.timestamp);
        expectedRequest.body.histograms = [measure1, measure2];

        batcher.addToBatch(measure1);
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();

        batcher.addToBatch(measure2);
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();

        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl, expectedRequest);
    });

    it('properly set end after start when only one element', async () => {
        const batcher = new Batcher(serverUrl);

        const expectedRequest = getBaseReportRequest(measure1.timestamp, measure1.timestamp + 1);
        expectedRequest.body.histograms = [measure1];

        batcher.addToBatch(measure1);
        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl, expectedRequest);
    });

    it('send the batch directly after maximum batch size is reached', async () => {
        const batcher = new Batcher(serverUrl);
        const expectedRequest = getBaseReportRequest(measure1.timestamp, measure2.timestamp);
        for (let i = 0; i < 99; i++) {
            batcher.addToBatch(measure1);
            expectedRequest.body.histograms.push(measure1);
        }
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();

        batcher.addToBatch(measure2);
        expectedRequest.body.histograms.push(measure2);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl, expectedRequest);

        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledTimes(1);
    });

    it('do not send batches when the config is set to false', async () => {
        await setMetricsConfig('false');
        const batcher = new Batcher(serverUrl);
        batcher.addToBatch(measure2);
        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('do not send batches when the config is set to false even on force send', async () => {
        await setMetricsConfig('false');
        const batcher = new Batcher(serverUrl);
        batcher.addToBatch(measure2);
        batcher.forceSend();
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();
        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('old elements do not drip into the next batch', async () => {
        const batcher = new Batcher(serverUrl);
        let expectedRequest = getBaseReportRequest(measure1.timestamp, measure1.timestamp + 1);
        expectedRequest.body.histograms = [measure1];

        batcher.addToBatch(measure1);
        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenLastCalledWith(expectedUrl, expectedRequest);

        expectedRequest = getBaseReportRequest(measure2.timestamp, measure2.timestamp + 1);
        expectedRequest.body.histograms = [];
        for (let i = 0; i < 100; i++) {
            batcher.addToBatch(measure2);
            expectedRequest.body.histograms.push(measure2);
        }
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenLastCalledWith(expectedUrl, expectedRequest);

        expectedRequest = getBaseReportRequest(measure3.timestamp, measure3.timestamp + 1);
        expectedRequest.body.histograms = [measure3];

        batcher.addToBatch(measure3);
        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenLastCalledWith(expectedUrl, expectedRequest);
    });

    it('force send sends the batch, and does not get resent after the timeout', async () => {
        const batcher = new Batcher(serverUrl);

        const expectedRequest = getBaseReportRequest(measure1.timestamp, measure2.timestamp);
        expectedRequest.body.histograms = [measure1, measure2];

        batcher.addToBatch(measure1);
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();

        batcher.addToBatch(measure2);
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();

        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl, expectedRequest);

        mockApiClient.post.mockClear();

        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();
    });
});
