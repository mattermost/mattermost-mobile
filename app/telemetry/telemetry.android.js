// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import LocalConfig from 'assets/config'; // eslint-disable-line

import {store} from 'app/mattermost';

import {
    saveToTelemetryServer,
    getDeviceInfo,
    setTraceRecord,
} from './telemetry_utils';

class Telemetry {
    constructor() {
        this.appStartTime = 0;
        this.reactInitializedStartTime = 0;
        this.reactInitializedEndTime = 0;
        this.metrics = [];
        this.currentMetrics = {};
        this.pendingSinceLaunchMetrics = [];
    }

    setAppStartTime(startTime) {
        this.appStartTime = startTime;
    }

    reset() {
        this.metrics = [];
        this.currentMetrics = {};
        this.pendingSinceLaunchMetrics = [];
    }

    canSendTelemetry() {
        const {config} = store.getState().entities.general;
        return Boolean(!__DEV__ && config.EnableDiagnostics === 'true' && LocalConfig.TelemetryEnabled);
    }

    start(names = [], time = 0) {
        if (this.canSendTelemetry()) {
            const d = new Date();
            const startTime = d.getTime();

            names.forEach((name) => {
                this.currentMetrics[name] = {
                    name,
                    startTime: time || startTime,
                };
            });
        }
    }

    end(names = []) {
        if (this.canSendTelemetry()) {
            const d = new Date();
            const endTime = d.getTime();
            names.forEach((name) => {
                const finalMetric = this.currentMetrics[name];

                if (finalMetric && finalMetric.startTime > 0) {
                    this.metrics.push({
                        ...finalMetric,
                        endTime,
                    });

                    Reflect.deleteProperty(this.currentMetrics, name);
                }
            });
        }
    }

    include(metrics = []) {
        if (this.canSendTelemetry()) {
            metrics.forEach((metric) => {
                this.metrics.push({
                    name: metric.name,
                    startTime: metric.startTime,
                    endTime: metric.endTime,
                });
            });
        }
    }

    startSinceLaunch(names = []) {
        if (this.canSendTelemetry()) {
            const d = new Date();
            const endTime = d.getTime();

            names.forEach((name) => {
                if (!this.appStartTime) {
                    this.pendingSinceLaunchMetrics.push({
                        name,
                        endTime,
                    });
                    return;
                }

                this.metrics.push({
                    name,
                    startTime: this.appStartTime,
                    endTime,
                });
            });
        }
    }

    remove(names = []) {
        names.forEach((name) => {
            const currentMetric = this.currentMetrics[name];

            if (currentMetric) {
                Reflect.deleteProperty(this.currentMetrics, name);
            }
        });
    }

    save() {
        if (!this.canSendTelemetry()) {
            return;
        }

        this.pendingSinceLaunchMetrics.forEach((pendingMetric) => {
            this.metrics.push({
                ...pendingMetric,
                startTime: this.appStartTime,
            });
        });

        if (this.metrics.length === 0) {
            return;
        }

        const metrics = this.metrics.filter((m) => m.endTime && m.startTime).map((metric) => {
            const {name, startTime, endTime} = metric;
            let dur;
            if (endTime && startTime) {
                dur = (endTime - startTime) * 1000;
            }

            return setTraceRecord({
                name,
                time: startTime * 1000,
                dur,
            });
        });

        const {config} = store.getState().entities.general;
        const deviceInfo = getDeviceInfo();
        deviceInfo.server_version = config.Version;

        saveToTelemetryServer({trace_events: metrics, device_info: deviceInfo});

        this.reset();
    }
}

const telemetry = new Telemetry();
export default telemetry;
