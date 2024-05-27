// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, Platform, type AppStateStatus} from 'react-native';

import {sendPerformanceReport} from '@actions/remote/performance';
import DatabaseManager from '@database/manager';
import {getConfigValue} from '@queries/servers/system';
import {toMilliseconds} from '@utils/datetime';
import {logDebug} from '@utils/log';

const MAX_BATCH_SIZE = 100;
const INTERVAL_TIME = toMilliseconds({seconds: 60});

class Batcher {
    private started = false;
    private batch: PerformanceReportMeasure[] = [];
    private serverUrl: string;
    private sendTimeout: NodeJS.Timeout | undefined;
    private lastAppStateIsActive = AppState.currentState === 'active';

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
        AppState.addEventListener('change', (appState) => this.onAppStateChange(appState));
    }

    private start() {
        this.started = true;
        clearTimeout(this.sendTimeout);
        this.sendTimeout = setTimeout(() => this.sendBatch(), INTERVAL_TIME);
    }

    private async sendBatch() {
        clearTimeout(this.sendTimeout);
        this.started = false;
        if (this.batch.length === 0) {
            return;
        }

        const toSend = this.getReport();

        // Empty the batch as soon as possible to avoid race conditions
        this.batch = [];

        const database = DatabaseManager.serverDatabases[this.serverUrl]?.database;
        if (!database) {
            return;
        }

        const clientPerformanceSetting = await getConfigValue(database, 'EnableClientMetrics');
        if (clientPerformanceSetting !== 'true') {
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

    private onAppStateChange(appState: AppStateStatus) {
        const isAppStateActive = appState === 'active';
        if (this.lastAppStateIsActive !== isAppStateActive && !isAppStateActive) {
            this.sendBatch();
        }
        this.lastAppStateIsActive = isAppStateActive;
    }

    public addToBatch(measure: PerformanceReportMeasure) {
        if (!this.started) {
            this.start();
        }

        logDebug('Performance metric:', measure);
        this.batch.push(measure);
        if (this.batch.length >= MAX_BATCH_SIZE) {
            this.sendBatch();
        }
    }
}

export default Batcher;
