// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import VIForegroundService from '@voximplant/react-native-foreground-service';

import {logError} from '@utils/log';

const channelConfig = {
    id: 'calls_channel',
    name: 'Mattermost',
    description: 'Mattermost Calls microphone while app is in the background',
    enableVibration: false,
};

export const foregroundServiceStart = async () => {
    await VIForegroundService.getInstance().createNotificationChannel(channelConfig);
    const notificationConfig = {
        channelId: 'calls_channel',
        id: 345678,
        title: 'Mattermost',
        text: 'Mattermost Calls Microphone',
        icon: '',
        button: 'Stop',
    };
    try {
        await VIForegroundService.getInstance().startService(notificationConfig);
    } catch (e) {
        logError('Calls: Cannot start ForegroundService, error:', e);
    }
};

export const foregroundServiceStop = async () => {
    await VIForegroundService.getInstance().stopService();
};
