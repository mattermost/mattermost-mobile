// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getBaseReportRequest(start: number, end: number): {body: PerformanceReport; headers: {}} {
    return {
        body: {
            version: '0.1.0',
            start,
            end,
            labels: {agent: 'rnapp', platform: 'ios'},
            histograms: [],
            counters: [],
        },
        headers: {Accept: 'application/json'},
    };
}
