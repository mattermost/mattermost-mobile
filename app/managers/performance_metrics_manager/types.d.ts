// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PerformanceReportMeasure = {
    metric: string;
    value: number;
    timestamp: number;
    label?: Record<string, string>;
}

type PerformanceReport = {
    version: '0.1.0';

    labels: {
        platform: PlatformLabel;
        agent: 'rnapp';
    };

    start: number;
    end: number;

    counters: PerformanceReportMeasure[];
    histograms: PerformanceReportMeasure[];
}

type NetworkRequestDataOtherInfo = {
    serverUrl: string;
    groupLabel: RequestGroupLabel;
}
