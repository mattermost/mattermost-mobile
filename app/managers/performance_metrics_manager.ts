// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTimeSinceStartup} from 'react-native-startup-time';

type Target = 'HOME' | 'CHANNEL' | 'THREAD' | undefined;
type MetricName = 'channelSwitch' |
    'teamSwitch';

class PerformanceMetricsManager {
    private startTimes: {[metricName: string]: undefined | number} = {};
    private target: Target;

    public setLoadTarget(target: Target) {
        this.target = target;
    }

    public finishLoad(location: Target) {
        if (this.target !== location) {
            return;
        }

        getTimeSinceStartup().then((v) => console.log(`Took ${v}`));
    }

    public startMetric(metricName: MetricName) {
        this.startTimes[metricName] = Date.now();
    }

    public endMetric(metricName: MetricName) {
        const startTime = this.startTimes[metricName];
        if (startTime === undefined) {
            return;
        }

        console.log(`CS took ${Date.now() - startTime}`);
        delete this.startTimes[metricName];
    }
}

export default new PerformanceMetricsManager();
