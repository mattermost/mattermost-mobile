// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {determineInitialExpoRoute, determinePostWireGuardRoute} from '@init/launch';

import {determineInitialExpoRouteWithFallback, determinePostWireGuardRouteWithFallback, INITIAL_LAUNCH_TIMEOUT_MS} from './launch_with_fallback';

jest.mock('@init/launch', () => ({
    determineInitialExpoRoute: jest.fn(),
    determinePostWireGuardRoute: jest.fn(),
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

describe('determineInitialExpoRouteWithFallback', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns the ordinary launch destination', async () => {
        const launchResult = {route: '/(authenticated)/(home)', params: {coldStart: true}};
        jest.mocked(determineInitialExpoRoute).mockResolvedValue(launchResult);

        await expect(determineInitialExpoRouteWithFallback()).resolves.toEqual(launchResult);
    });

    it('returns the server destination when ordinary launch routing rejects', async () => {
        jest.mocked(determineInitialExpoRoute).mockRejectedValue(new Error('launch initialization failed'));

        await expect(determineInitialExpoRouteWithFallback()).resolves.toEqual({
            route: '/(unauthenticated)/server',
            params: {launchError: true},
        });
    });

    it('uses the dedicated post-WireGuard resolver', async () => {
        const launchResult = {route: '/(unauthenticated)/server', params: {coldStart: false}};
        jest.mocked(determinePostWireGuardRoute).mockResolvedValue(launchResult);

        await expect(determinePostWireGuardRouteWithFallback()).resolves.toEqual(launchResult);
        expect(determineInitialExpoRoute).not.toHaveBeenCalled();
    });

    it('returns the server destination when ordinary launch routing times out', async () => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
        jest.mocked(determineInitialExpoRoute).mockReturnValue(new Promise<never>(() => undefined));

        const result = determineInitialExpoRouteWithFallback();
        jest.advanceTimersByTime(INITIAL_LAUNCH_TIMEOUT_MS);

        await expect(result).resolves.toEqual({
            route: '/(unauthenticated)/server',
            params: {launchError: true},
        });
    });
});
