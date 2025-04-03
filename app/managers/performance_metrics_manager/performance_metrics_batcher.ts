// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

import {sendPerformanceReport} from '@actions/remote/performance';
import DatabaseManager from '@database/manager';
import {getConfigValue} from '@queries/servers/system';
import {toMilliseconds} from '@utils/datetime';
import {logDebug} from '@utils/log';

const MAX_BATCH_SIZE = 100;
const INTERVAL_TIME = toMilliseconds({seconds: 60});

class Batcher {
    private batch: PerformanceReportMeasure[] = [];
    private serverUrl: string;
    private sendTimeout: NodeJS.Timeout | undefined;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    private async fetchClientPerformanceSetting() {
        const database = DatabaseManager.serverDatabases[this.serverUrl]?.database;
        if (!database) {
            return false;
        }

        const value = await getConfigValue(database, 'EnableClientMetrics');
        return value === 'true';
    }

    private started() {
        return Boolean(this.sendTimeout);
    }

    private clearTimeout() {
        clearTimeout(this.sendTimeout);
        this.sendTimeout = undefined;
    }

    private start() {
        this.clearTimeout();
        this.sendTimeout = setTimeout(() => this.sendBatch(), INTERVAL_TIME);
    }

    private async sendBatch() {
        this.clearTimeout();
        if (this.batch.length === 0) {
            return;
        }

        const toSend = this.getReport();

        // Empty the batch as soon as possible to avoid race conditions
        this.batch = [];

        if (!await this.fetchClientPerformanceSetting()) {
            return;
        }

        await sendPerformanceReport(this.serverUrl, toSend);
    }

    private getReport(): PerformanceReport {
        let start = this.batch[0].timestamp;
        let end = this.batch[0].timestamp;
        for (const measure of this.batch) {
            start = Math.min(start, measure.timestamp);
            end = Math.max(end, measure.timestamp);
        }
        if (start === end) {
            end += 1;
        }

        return {
            version: '0.1.0',
            labels: {
                platform: Platform.select({ios: 'ios', default: 'android'}),
                agent: 'rnapp',
            },
            start,
            end,
            counters: [],
            histograms: this.batch,
        };
    }

    public addToBatch(measure: PerformanceReportMeasure) {
        if (!this.started()) {
            this.start();
        }

        logDebug('Performance metric:', measure);
        this.batch.push(measure);
        if (this.batch.length >= MAX_BATCH_SIZE) {
            this.sendBatch();
        }
    }

    public forceSend() {
        this.sendBatch();
    }
}

export const testExports = {
    MAX_BATCH_SIZE,
    INTERVAL_TIME,
};
export default Batcher;
