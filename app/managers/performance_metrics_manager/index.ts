// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTimeSinceStartup} from 'react-native-startup-time';

import Batcher from './performance_metrics_batcher';

type Target = 'HOME' | 'CHANNEL' | 'THREAD' | undefined;
type MetricName = 'mobile_channel_switch' |
    'mobile_team_switch';

class PerformanceMetricsManager {
    private startTimes: {[metricName: string]: undefined | number} = {};
    private target: Target;
    private batchers: {[serverUrl: string]: Batcher} = {};

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
        if (this.target !== location) {
            return;
        }

        getTimeSinceStartup().then((measure) => {
            this.ensureBatcher(serverUrl).addToBatch({
                metric: 'mobile_load',
                value: measure / 1000,
                timestamp: Date.now(),
            });
        });
    }

    public startMetric(metricName: MetricName) {
        this.startTimes[metricName] = global.performance.now();
    }

    public endMetric(metricName: MetricName, serverUrl: string) {
        const startTime = this.startTimes[metricName];
        if (startTime === undefined) {
            return;
        }

        const dateNow = Date.now();
        const performanceNow = global.performance.now();
        const performanceNowSkew = dateNow - performanceNow;

        this.ensureBatcher(serverUrl).addToBatch({
            metric: metricName,
            value: (performanceNow - startTime) / 1000,
            timestamp: Math.round(startTime + performanceNowSkew),
        });

        delete this.startTimes[metricName];
    }
}

export default new PerformanceMetricsManager();
