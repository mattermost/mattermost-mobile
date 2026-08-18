// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as SplashScreen from 'expo-splash-screen';

let hidden = false;

export function hideLaunchSplash() {
    if (hidden) {
        return;
    }
    hidden = true;

    // hideAsync rejects if the splash is already hidden; safe to ignore.
    SplashScreen.hideAsync().catch(() => undefined);
}
