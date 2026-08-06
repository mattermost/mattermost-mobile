// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RUNNING_E2E} from '@env';
import RNUtils from '@mattermost/rnutils';

function launchArgDisablesTutorials(): boolean {
    try {
        return RNUtils.areTutorialsDisabled() === true;
    } catch {
        // Older e2e artifacts may not ship this native method yet.
        return false;
    }
}

/**
 * Tutorials are device-local WatermelonDB flags. Detox wipes app data between
 * files, so they would otherwise reappear and steal Espresso focus on Android.
 *
 * Prefer Detox/Maestro disableTutorials launch args (via RNUtils). RUNNING_E2E
 * covers Metro / skip_build runs where the native binary may not expose the flag.
 */
export function areTutorialsDisabled(
    runningE2e: string = RUNNING_E2E,
    launchArgCheck: () => boolean = launchArgDisablesTutorials,
): boolean {
    return runningE2e === 'true' || launchArgCheck();
}
