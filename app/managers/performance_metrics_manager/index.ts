// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus} from 'react-native';
import performance from 'react-native-performance';

import Batcher from './performance_metrics_batcher';

type Target = 'HOME' | 'CHANNEL' | 'THREAD' | undefined;
type MetricName = 'mobile_channel_switch' |
    'mobile_team_switch';

class PerformanceMetricsManager {
    private target: Target;
    private batchers: {[serverUrl: string]: Batcher} = {};
    private hasRegisteredLoad = false;
    private lastAppStateIsActive = AppState.currentState === 'active';

    constructor() {
        AppState.addEventListener('change', (appState) => this.onAppStateChange(appState));
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

    public finishLoad(location: Target, serverUrl: string) {
        if (this.target !== location || this.hasRegisteredLoad) {
            return;
        }

        const measure = performance.measure('mobile_load', 'nativeLaunchStart');
        this.ensureBatcher(serverUrl).addToBatch({
            metric: 'mobile_load',
            value: measure.duration,
            timestamp: Date.now(),
        });
        performance.clearMeasures('mobile_load');
        this.hasRegisteredLoad = true;
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
}

export default new PerformanceMetricsManager();
