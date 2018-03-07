// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Analytics from 'analytics-react-native';
import DeviceInfo from 'react-native-device-info';
import {Dimensions} from 'react-native';

import Config from 'assets/config';

import tracker from './time_tracker';

let diagnosticId;

export function init(config) {
    if (!global.analytics) {
        diagnosticId = config.DiagnosticId;
        const {height, width} = Dimensions.get('window');
        global.analytics = new Analytics(Config.SegmentApiKey, {
            flushAt: 20,
            flushInterval: 10000,
        });
        global.analytics_context = {
            app: {
                version: DeviceInfo.getVersion(),
                build: DeviceInfo.getBuildNumber(),
            },
            device: {
                dimensions: {
                    height,
                    width,
                },
                isTablet: DeviceInfo.isTablet(),
                os: DeviceInfo.getSystemVersion(),
            },
            ip: '0.0.0.0',
            server: config.Version,
        };

        global.analytics.identify({
            userId: diagnosticId,
            context: global.analytics_context,
            page: {
                path: '',
                referrer: '',
                search: '',
                title: '',
                url: '',
            },
            anonymousId: '00000000000000000000000000',
        });
    }
}

export function recordTime(screenName, category, userId) {
    if (global.analytics) {
        const startTime = tracker[category];
        tracker[category] = 0;
        global.analytics.screen({
            userId: diagnosticId,
            name: screenName,
            context: global.analytics_context,
            properties: {
                actual_user_id: userId,
                time: Date.now() - startTime,
            },
        });
    }
}
