// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

jest.mock('expo-splash-screen', () => ({
    hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('./launch_profiler', () => ({
    launchMark: jest.fn(),
}));

type SplashModule = typeof import('./splash');
type SplashScreenModule = typeof import('expo-splash-screen');

describe('splash', () => {
    beforeEach(() => {
        enableFakeTimers();
        jest.resetModules();
        jest.clearAllMocks();
    });

    afterEach(() => {
        disableFakeTimers();
    });

    function loadSplash() {
        const splash = require('./splash') as SplashModule;
        const splashScreen = require('expo-splash-screen') as SplashScreenModule;
        return {
            splash,
            hideAsync: jest.mocked(splashScreen.hideAsync),
        };
    }

    it('should hide the launch splash', () => {
        const {splash, hideAsync} = loadSplash();

        splash.hideLaunchSplash();

        expect(hideAsync).toHaveBeenCalledTimes(1);
    });

    it('should keep the splash hidden when hide is called again', () => {
        const {splash, hideAsync} = loadSplash();

        splash.hideLaunchSplash();
        splash.hideLaunchSplash();

        expect(hideAsync).toHaveBeenCalledTimes(1);
    });

    it('should hide the splash after the fallback timer', async () => {
        const {splash, hideAsync} = loadSplash();

        splash.armLaunchSplashFallback();
        expect(hideAsync).not.toHaveBeenCalled();

        await advanceTimers(30000);

        expect(hideAsync).toHaveBeenCalledTimes(1);
    });

    it('should not hide from the fallback after the splash is already hidden', async () => {
        const {splash, hideAsync} = loadSplash();

        splash.hideLaunchSplash();
        splash.armLaunchSplashFallback();
        await advanceTimers(30000);

        expect(hideAsync).toHaveBeenCalledTimes(1);
    });

    it('should not hide again if hidden before the fallback fires', async () => {
        const {splash, hideAsync} = loadSplash();

        splash.armLaunchSplashFallback();
        splash.hideLaunchSplash();
        await advanceTimers(30000);

        expect(hideAsync).toHaveBeenCalledTimes(1);
    });

    it('should hide the splash after channels painted', () => {
        const {splash, hideAsync} = loadSplash();

        splash.hideLaunchSplashAfterChannelsPainted();

        expect(hideAsync).toHaveBeenCalledTimes(1);
    });

    it('should keep the splash hidden when channels painted is signaled again', () => {
        const {splash, hideAsync} = loadSplash();

        splash.hideLaunchSplashAfterChannelsPainted();
        splash.hideLaunchSplashAfterChannelsPainted();

        expect(hideAsync).toHaveBeenCalledTimes(1);
    });
});
