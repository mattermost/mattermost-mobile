// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {determineInitialExpoRoute, determinePostWireGuardRoute, type ExpoRouterLaunchResult} from '@init/launch';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

export const INITIAL_LAUNCH_TIMEOUT_MS = 15000;

type RouteResolver = () => Promise<ExpoRouterLaunchResult>;

/**
 * Resolve ordinary launch routing without leaving a route mounted with no content.
 * The WireGuard gate is enforced by callers before this function is invoked.
 */
async function withServerFallback(resolveRoute: RouteResolver): Promise<ExpoRouterLaunchResult> {
    let launchTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
        const timeoutPromise = new Promise<never>((_, reject) => {
            launchTimeout = setTimeout(() => reject(new Error('Initial route determination timed out')), INITIAL_LAUNCH_TIMEOUT_MS);
        });
        return await Promise.race([resolveRoute(), timeoutPromise]);
    } catch (error) {
        logError('Unable to determine the initial route after launch', getFullErrorMessage(error));
        return {route: '/(unauthenticated)/server', params: {launchError: true}};
    } finally {
        if (launchTimeout) {
            clearTimeout(launchTimeout);
        }
    }
}

export function determineInitialExpoRouteWithFallback(): Promise<ExpoRouterLaunchResult> {
    return withServerFallback(determineInitialExpoRoute);
}

export function determinePostWireGuardRouteWithFallback(): Promise<ExpoRouterLaunchResult> {
    return withServerFallback(determinePostWireGuardRoute);
}
