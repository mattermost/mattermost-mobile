// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as SplashScreen from 'expo-splash-screen';

import {launchMark} from './launch_profiler';

const SPLASH_FALLBACK_MS = 30000;

let hidden = false;
let channelsPainted = false;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

export function hideLaunchSplash() {
    if (hidden) {
        return;
    }
    hidden = true;

    if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
    }

    // hideAsync rejects if the splash is already hidden; safe to ignore.
    SplashScreen.hideAsync().catch(() => undefined);
}

export function armLaunchSplashFallback() {
    if (fallbackTimer !== undefined || hidden) {
        return;
    }
    fallbackTimer = setTimeout(() => {
        hideLaunchSplash();
    }, SPLASH_FALLBACK_MS);
}

export function hideLaunchSplashAfterChannelsPainted() {
    if (!channelsPainted) {
        channelsPainted = true;
        launchMark('channels_painted');
    }
    hideLaunchSplash();
}
