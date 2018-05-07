// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NativeModules} from 'react-native';
const {StartTime} = NativeModules;

function logger(message, data) {
    fetch('http://192.168.0.18:5001/', {
        method: 'post',
        body: JSON.stringify({
            message,
            data,
        }),
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    });
}

class Telemetry {
    constructor() {
        /**
         * metric: {
         *   name:
         *   startTime:
         *   endTime:
         *   elapsedTime:
         * }
         */
        this.appStartTime = 0;
        this.reactInitializedStartTime = 0;
        this.reactInitializedEndTime = 0;
        this.metrics = [];
        this.currentMetrics = {};
        this.pendingSinceLaunchMetrics = [];

        this.initializeNativeMetrics();
    }

    initializeNativeMetrics = async () => {
        const nativeTimes = await StartTime.getNativeTimes();
        this.appStartTime = nativeTimes.appStartTime;
        this.reactInitializedStartTime = nativeTimes.reactInitializedStartTime;
        this.reactInitializedEndTime = nativeTimes.reactInitializedEndTime;

        this.metrics.push({
            name: 'reactInitialized',
            startTime: nativeTimes.reactInitializedStartTime,
            endTime: nativeTimes.reactInitializedEndTime,
        });

        if (this.pendingSinceLaunchMetrics.length > 0) {
            for (const i in this.pendingSinceLaunchMetrics) {
                if (this.pendingSinceLaunchMetrics.hasOwnProperty(i)) {
                    const pending = this.pendingSinceLaunchMetrics[i];
                    this.metrics.push({
                        ...pending,
                        startTime: nativeTimes.appStartTime,
                    });
                }
            }
            this.pendingSinceLaunchMetrics = [];
        }

        await StartTime.sinceLaunch('testSinceLaunch');
    };

    captureStart(name) {
        const d = new Date();

        this.currentMetrics[name] = {
            name,
            startTime: d.getTime(),
        };
    }

    captureEnd(name) {
        const d = new Date();
        const finalMetric = this.currentMetrics[name];

        this.metrics.push({
            ...finalMetric,
            endTime: d.getTime(),
        });

        Reflect.deleteProperty(this.currentMetrics, name);
    }

    capture(name, startTime, endTime) {
        this.metrics.push({
            name,
            startTime,
            endTime,
        });
    }

    captureSinceLaunch(name) {
        const d = new Date();

        if (!this.appStartTime) {
            this.pendingSinceLaunchMetrics.push({
                name: `sinceLaunch:${name}`,
                endTime: d.getTime(),
            });

            return;
        }

        this.metrics.push({
            name: `sinceLaunch:${name}`,
            startTime: this.appStartTime,
            endTime: d.getTime(),
        });
    }

    sendMetrics() {
        const d = new Date();
        this.metrics.push({
            name: 'totalDuration',
            startTime: this.appStartTime,
            endTime: d.getTime(),
        });

        if (!__DEV__) { // eslint-disable-line no-undef
            logger('metrics', this.metrics);
        }
    }
}

const telemetry = new Telemetry();
export default telemetry;
