// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DeviceInfo from 'react-native-device-info';
import {Dimensions} from 'react-native';

import LocalConfig from '@assets/config.json';
import {Config} from '@mm-redux/types/config';
import tracker from '@utils/time_tracker';

type RudderClient = {
    setup(key: string, options: any): Promise<void>;
    track(event: string, properties: Record<string, any> | undefined, options?: Record<string, any>): void;
    identify(userId: string, traits: Record<string, any>, options?: Record<string, any>): Promise<void>;
    screen(name: string, properties: Record<string, any> | undefined, options?: Record<string, any>): void;
    reset(): Promise<void>;
}

let diagnosticId: string | undefined;
export let analytics: RudderClient | null = null;
export let context: any;

export async function init(config: Config) {
    if (!analytics) {
        analytics = require('@rudderstack/rudder-sdk-react-native').default;
    }

    if (analytics) {
        const {height, width} = Dimensions.get('window');
        diagnosticId = config.DiagnosticId;

        if (diagnosticId) {
            await analytics.setup(LocalConfig.RudderApiKey, {
                dataPlaneUrl: 'https://pdat.matterlytics.com',
                recordScreenViews: true,
                flushQueueSize: 20,
            });

            context = {
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

            analytics.identify(
                diagnosticId,
                context,
            );
        } else {
            analytics.reset();
        }
    }

    return analytics;
}

export function recordTime(screenName: string, category: string, userId: string) {
    if (analytics) {
        const track: Record<string, number> = tracker;
        const startTime: number = track[category];
        track[category] = 0;
        analytics.screen(
            screenName, {
                userId: diagnosticId,
                context,
                properties: {
                    actual_user_id: userId,
                    time: Date.now() - startTime,
                },
            },
        );
    }
}
