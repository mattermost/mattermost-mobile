// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {mockApiClient} from '@test/mock_api_client';
import TestHelper from '@test/test_helper';

import NetworkManager from '../network_manager';

import {getBaseReportRequest} from './test_utils';

import PerformanceMetricsManager from '.';

jest.mock('@utils/log', () => ({
    logDebug: () => '',
}));

jest.mock('react-native-startup-time', () => ({
    getTimeSinceStartup: () => Promise.resolve(2000),
}));

describe('load metrics', () => {
    const serverUrl = 'http://www.someserverurl.com/';
    const expectedUrl = `${serverUrl}/api/v4/client_perf`;

    const measure: PerformanceReportMeasure = {
        metric: 'mobile_load',
        timestamp: 1577836861000,
        value: 2,
    };

    beforeEach(async () => {
        NetworkManager.createClient(serverUrl);
        const {operator} = await TestHelper.setupServerDatabase(serverUrl);
        await operator.handleConfigs({configs: [{id: 'EnableClientMetrics', value: 'true'}], configsToDelete: [], prepareRecordsOnly: false});
        jest.useFakeTimers({doNotFake: [
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
        ]}).setSystemTime(new Date('2020-01-01'));
    });
    afterEach(async () => {
        jest.useRealTimers();
        NetworkManager.invalidateClient(serverUrl);
        await TestHelper.tearDown();
    });

    it('only load on target', async () => {
        const expectedRequest = getBaseReportRequest(measure.timestamp, measure.timestamp + 1);
        expectedRequest.body.histograms = [measure];

        PerformanceMetricsManager.setLoadTarget('CHANNEL');
        PerformanceMetricsManager.finishLoad('HOME', serverUrl);
        await TestHelper.tick();
        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();
        PerformanceMetricsManager.finishLoad('CHANNEL', serverUrl);
        await TestHelper.tick();
        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl, expectedRequest);
    });
});

describe('other metrics', () => {
    const serverUrl1 = 'http://www.someserverurl.com/';
    const expectedUrl1 = `${serverUrl1}/api/v4/client_perf`;

    const serverUrl2 = 'http://www.otherserverurl.com/';
    const expectedUrl2 = `${serverUrl2}/api/v4/client_perf`;

    const measure1: PerformanceReportMeasure = {
        metric: 'mobile_channel_switch',
        timestamp: 1577836800000,
        value: 0.1,
    };

    const measure2: PerformanceReportMeasure = {
        metric: 'mobile_team_switch',
        timestamp: 1577836800050,
        value: 0.15,
    };

    beforeEach(async () => {
        NetworkManager.createClient(serverUrl1);
        NetworkManager.createClient(serverUrl2);
        const {operator: operator1} = await TestHelper.setupServerDatabase(serverUrl1);
        const {operator: operator2} = await TestHelper.setupServerDatabase(serverUrl2);
        await operator1.handleConfigs({configs: [{id: 'EnableClientMetrics', value: 'true'}], configsToDelete: [], prepareRecordsOnly: false});
        await operator2.handleConfigs({configs: [{id: 'EnableClientMetrics', value: 'true'}], configsToDelete: [], prepareRecordsOnly: false});
        jest.useFakeTimers({doNotFake: [
            'cancelAnimationFrame',
            'cancelIdleCallback',
            'clearImmediate',
            'clearInterval',
            'clearTimeout',
            'hrtime',
            'nextTick',
            'queueMicrotask',
            'requestAnimationFrame',
            'requestIdleCallback',
            'setImmediate',
            'setInterval',
        ]}).setSystemTime(new Date('2020-01-01'));
    });
    afterEach(async () => {
        jest.useRealTimers();
        NetworkManager.invalidateClient(serverUrl1);
        NetworkManager.invalidateClient(serverUrl2);
        await TestHelper.tearDown();
    });

    it('do not send metrics when we dont start them', async () => {
        PerformanceMetricsManager.endMetric('mobile_channel_switch', serverUrl1);

        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('send metric after it has been started', async () => {
        const expectedRequest = getBaseReportRequest(measure1.timestamp, measure1.timestamp + 1);
        expectedRequest.body.histograms = [measure1];

        PerformanceMetricsManager.startMetric('mobile_channel_switch');
        jest.advanceTimersByTime(100);

        PerformanceMetricsManager.endMetric('mobile_channel_switch', serverUrl1);
        await TestHelper.tick();

        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl1, expectedRequest);
    });

    it('a second end metric does not generate a second measure', async () => {
        const expectedRequest = getBaseReportRequest(measure1.timestamp, measure1.timestamp + 1);
        expectedRequest.body.histograms = [measure1];

        PerformanceMetricsManager.startMetric('mobile_channel_switch');
        jest.advanceTimersByTime(100);

        PerformanceMetricsManager.endMetric('mobile_channel_switch', serverUrl1);
        await TestHelper.tick();
        jest.advanceTimersByTime(100);

        PerformanceMetricsManager.endMetric('mobile_channel_switch', serverUrl1);
        await TestHelper.tick();

        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl1, expectedRequest);
    });

    it('different metrics do not interfere', async () => {
        const expectedRequest = getBaseReportRequest(measure1.timestamp, measure2.timestamp);
        expectedRequest.body.histograms = [measure1, measure2];

        PerformanceMetricsManager.startMetric('mobile_channel_switch');
        jest.advanceTimersByTime(50);
        PerformanceMetricsManager.startMetric('mobile_team_switch');
        jest.advanceTimersByTime(50);

        PerformanceMetricsManager.endMetric('mobile_channel_switch', serverUrl1);
        await TestHelper.tick();
        jest.advanceTimersByTime(100);
        PerformanceMetricsManager.endMetric('mobile_team_switch', serverUrl1);
        await TestHelper.tick();

        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl1, expectedRequest);
    });

    it('metrics to different servers do not interfere', async () => {
        const expectedRequest1 = getBaseReportRequest(measure1.timestamp, measure1.timestamp + 1);
        expectedRequest1.body.histograms = [measure1];

        const expectedRequest2 = getBaseReportRequest(measure2.timestamp, measure2.timestamp + 1);
        expectedRequest2.body.histograms = [measure2];

        PerformanceMetricsManager.startMetric('mobile_channel_switch');
        jest.advanceTimersByTime(50);
        PerformanceMetricsManager.startMetric('mobile_team_switch');
        jest.advanceTimersByTime(50);

        PerformanceMetricsManager.endMetric('mobile_channel_switch', serverUrl1);
        await TestHelper.tick();
        jest.advanceTimersByTime(100);
        PerformanceMetricsManager.endMetric('mobile_team_switch', serverUrl2);
        await TestHelper.tick();

        jest.advanceTimersByTime(61000);
        await TestHelper.tick();
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl1, expectedRequest1);
        expect(mockApiClient.post).toHaveBeenCalledWith(expectedUrl2, expectedRequest2);
    });
});
