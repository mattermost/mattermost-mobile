// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {determineInitialExpoRoute, type ExpoRouterLaunchResult} from '@init/launch';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

export const INITIAL_LAUNCH_TIMEOUT_MS = 15000;

/**
 * Resolve ordinary launch routing without leaving a route mounted with no content.
 * The WireGuard gate is enforced by callers before this function is invoked.
 */
export async function determineInitialExpoRouteWithFallback(): Promise<ExpoRouterLaunchResult> {
    let launchTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
        const timeoutPromise = new Promise<never>((_, reject) => {
            launchTimeout = setTimeout(() => reject(new Error('Initial route determination timed out')), INITIAL_LAUNCH_TIMEOUT_MS);
        });
        return await Promise.race([determineInitialExpoRoute(), timeoutPromise]);
    } catch (error) {
        logError('Unable to determine the initial route after launch', getFullErrorMessage(error));
        return {route: '/(unauthenticated)/server', params: {launchError: true}};
    } finally {
        if (launchTimeout) {
            clearTimeout(launchTimeout);
        }
    }
}
