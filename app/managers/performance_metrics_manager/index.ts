// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import {AppState, type AppStateStatus} from 'react-native';
import performance from 'react-native-performance';

import {logDebug, logWarning} from '@utils/log';

import Batcher from './performance_metrics_batcher';

import type {NetworkRequestMetrics} from './constant';
import type {MarkOptions} from 'react-native-performance/lib/typescript/performance';

type Target = 'HOME' | 'CHANNEL' | 'THREAD' | undefined;

type MetricName = 'mobile_channel_switch' |
    'mobile_team_switch';

const RETRY_TIME = 100;
const MAX_RETRIES = 3;

class PerformanceMetricsManagerSingleton {
    private target: Target;
    private batchers: {[serverUrl: string]: Batcher} = {};
    private lastAppStateIsActive = AppState.currentState === 'active';

    constructor() {
        AppState.addEventListener('change', (appState: AppStateStatus) => this.onAppStateChange(appState));
    }

    private onAppStateChange(appState: AppStateStatus) {
        const isAppStateActive = appState === 'active';
        if (this.lastAppStateIsActive !== isAppStateActive && !isAppStateActive) {
            for (const batcher of Object.values(this.batchers)) {
                batcher.forceSend();
            }
        }
        this.lastAppStateIsActive = isAppStateActive;
    }

    private ensureBatcher(serverUrl: string) {
        if (this.batchers[serverUrl]) {
            return this.batchers[serverUrl];
        }

        this.batchers[serverUrl] = new Batcher(serverUrl);
        return this.batchers[serverUrl];
    }

    public setLoadTarget(target: Target) {
        this.target = target;
    }

    public skipLoadMetric() {
        RNUtils.setHasRegisteredLoad();
    }

    public finishLoad(location: Target, serverUrl: string) {
        this.finishLoadWithRetries(location, serverUrl, 0);
    }

    private finishLoadWithRetries(location: Target, serverUrl: string, retries: number) {
        if (this.target !== location || RNUtils.getHasRegisteredLoad().hasRegisteredLoad) {
            return;
        }

        try {
            const measure = performance.measure('mobile_load', 'nativeLaunchStart');
            this.ensureBatcher(serverUrl).addToBatch({
                metric: 'mobile_load',
                value: measure.duration,
                timestamp: Date.now(),
            });
            performance.clearMeasures('mobile_load');
        } catch {
            // There seems to be a race condition where in some scenarios, the mobile load
            // mark does not exist. We add this to avoid crashes related to this.
            if (retries < MAX_RETRIES) {
                setTimeout(() => this.finishLoadWithRetries(location, serverUrl, retries + 1), RETRY_TIME);
                return;
            }
            logWarning('We could not retrieve the mobile load metric');
        }

        RNUtils.setHasRegisteredLoad();
    }

    public startMetric(metricName: MetricName) {
        performance.mark(metricName);
    }

    public endMetric(metricName: MetricName, serverUrl: string) {
        const marks = performance.getEntriesByName(metricName, 'mark');
        if (!marks.length) {
            return;
        }

        const measureName = `${metricName}_measure`;
        const measure = performance.measure(measureName, metricName);

        this.ensureBatcher(serverUrl).addToBatch({
            metric: metricName,
            value: measure.duration,
            timestamp: Date.now(),
        });

        performance.clearMarks(metricName);
        performance.clearMeasures(measureName);
    }

    public startTimeToInteraction(options?: MarkOptions) {
        performance.mark('tti', options);
    }

    public measureTimeToInteraction() {
        try {
            const result = performance.measure('TTI', 'tti');
            performance.clearMarks('tti');
            performance.clearMeasures('TTI');
            logDebug('Time to Interaction', result.duration);
            return result;
        } catch {
            return undefined;
        }
    }

    public collectNetworkRequestData = (name: NetworkRequestMetrics, value: number, {serverUrl, groupLabel}: NetworkRequestDataOtherInfo) => {
        this.ensureBatcher(serverUrl).addToBatch({
            metric: name,
            value,
            timestamp: Date.now(),
            label: {network_request_group: groupLabel},
        });
    };
}

export const testExports = {
    PerformanceMetricsManagerSingleton,
    RETRY_TIME,
    MAX_RETRIES,
};

const PerformanceMetricsManager = new PerformanceMetricsManagerSingleton();
export default PerformanceMetricsManager;
