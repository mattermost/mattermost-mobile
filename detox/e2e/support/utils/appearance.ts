// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {execSync} from 'child_process';

import {isAndroid, isIos} from '@support/utils';

/**
 * Set the device appearance mode (light or dark) on the simulator/emulator.
 * - iOS: Uses `xcrun simctl ui booted appearance`
 * - Android: Uses `adb shell cmd uimode night`
 * @param {('light' | 'dark')} mode - The appearance mode to set
 */
export const setDeviceAppearance = (mode: 'light' | 'dark'): void => {
    if (isIos()) {
        execSync(`xcrun simctl ui booted appearance ${mode}`);
    } else if (isAndroid()) {
        const nightMode = mode === 'dark' ? 'yes' : 'no';
        execSync(`adb shell "cmd uimode night ${nightMode}"`);
    }
};
