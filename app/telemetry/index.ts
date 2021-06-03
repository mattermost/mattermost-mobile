// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTimeSinceStartup} from 'react-native-startup-time';

export interface PerfMetric {
    name: string;
    startTime: number;
    endTime?: number;
    extra: string;
}

export const PERF_MARKERS = {
    START_SINCE_LAUNCH: 'Start Since Launch',
    CHANNEL_RENDER: 'Channel Render',
    CHANNEL_SWITCH: 'Channe Switch',
};

class Telemetry {
    metrics: PerfMetric[];
    currentMetrics: Record<string, PerfMetric>;

    constructor() {
        this.metrics = [];
        this.currentMetrics = {};
    }

    getMetrics = () => {
        return this.metrics;
    }

    reset() {
        this.currentMetrics = {};
    }

    start(names = [], time = 0, extra = []) {
        const startTime = Date.now();

        names.forEach((name, index) => {
            this.currentMetrics[name] = {
                extra: extra[index],
                name,
                startTime: time || startTime,
            };
        });
    }

    end(names: string[] = []) {
        const endTime = Date.now();
        names.forEach((name) => {
            const finalMetric = this.currentMetrics[name];

            if (finalMetric && finalMetric.startTime >= 0) {
                this.metrics.push({
                    ...finalMetric,
                    endTime,
                });

                Reflect.deleteProperty(this.currentMetrics, name);
            }
        });
    }

    startSinceLaunch(extra = '') {
        getTimeSinceStartup().then((endTime) => {
            this.metrics.push({
                extra,
                name: PERF_MARKERS.START_SINCE_LAUNCH,
                startTime: 0,
                endTime,
            });
        });
    }

    remove(names = []) {
        names.forEach((name) => {
            const currentMetric = this.currentMetrics[name];

            if (currentMetric) {
                Reflect.deleteProperty(this.currentMetrics, name);
            }
        });
    }
}

const telemetry = new Telemetry();
export default telemetry;
