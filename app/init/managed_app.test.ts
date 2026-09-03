// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Emm, {AuthenticationOutcome} from '@mattermost/react-native-emm';
import {isRootedExperimentalAsync} from 'expo-device';
import {Alert} from 'react-native';

import * as alerts from '@utils/alerts';

import ManagedApp from './managed_app';

jest.mock('@mattermost/react-native-emm', () => ({
    AuthenticationOutcome: {
        Failed: 'E_AUTH_FAILED',
        Cancelled: 'E_CANCELLED',
        Indeterminate: 'E_INDETERMINATE',
    },
    addListener: jest.fn(),
    authenticate: jest.fn(),
    enableBlurScreen: jest.fn(),
    exitApp: jest.fn(),
    getManagedConfig: jest.fn(() => ({})),
    isDeviceSecured: jest.fn(),
    openSecuritySettings: jest.fn(),
    setAppGroupId: jest.fn(),
}));
jest.mock('expo-device', () => ({
    isRootedExperimentalAsync: jest.fn(),
}));
jest.mock('@utils/mattermost_managed', () => ({
    getIOSAppGroupDetails: jest.fn(() => ({appGroupIdentifier: 'group.test'})),
}));
jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
    logError: jest.fn(),
}));

const rejectWith = (outcome: AuthenticationOutcome) => {
    const error = new Error(outcome) as Error & {outcome: AuthenticationOutcome};
    error.outcome = outcome;
    return error;
};

describe('ManagedApp', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ManagedApp.enabled = false;
        ManagedApp.inAppPinCode = false;
        ManagedApp.vendor = 'Mattermost';
        ManagedApp.performingAuthentication = false;
        ManagedApp.backgroundSince = 0;
        ManagedApp.previousAppState = undefined;

        jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);
        jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
        jest.mocked(Emm.authenticate).mockResolvedValue(true);

        // These resolve only when an alert button is pressed, which would hang.
        jest.spyOn(alerts, 'showNotSecuredAlert').mockResolvedValue(undefined);
        jest.spyOn(alerts, 'showAuthenticationInterruptedAlert').mockResolvedValue('dismiss');
        jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    });

    describe('processConfig', () => {
        test('should apply the managed configuration', async () => {
            await ManagedApp.processConfig({
                vendor: 'Acme',
                inAppPinCode: 'true',
                blurApplicationScreen: 'true',
            } as ManagedConfig);

            expect(ManagedApp.enabled).toBe(true);
            expect(ManagedApp.vendor).toBe('Acme');
            expect(ManagedApp.inAppPinCode).toBe(true);
            expect(Emm.enableBlurScreen).toHaveBeenCalledWith(true);
        });

        test('should not be enabled when there is no managed configuration', async () => {
            await ManagedApp.processConfig({} as ManagedConfig);

            expect(ManagedApp.enabled).toBe(false);
            expect(Emm.enableBlurScreen).not.toHaveBeenCalled();
        });

        test('should leave inAppPinCode false on a rooted device so the server path is not suppressed', async () => {
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);

            await ManagedApp.processConfig({
                jailbreakProtection: 'true',
                inAppPinCode: 'true',
            } as ManagedConfig);

            expect(Alert.alert).toHaveBeenCalled();
            expect(ManagedApp.inAppPinCode).toBe(false);
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });
    });

    describe('handleDeviceAuthentication', () => {
        test('should authenticate and clear the flag', async () => {
            await expect(ManagedApp.handleDeviceAuthentication()).resolves.toBe(true);

            expect(Emm.authenticate).toHaveBeenCalled();
            expect(ManagedApp.performingAuthentication).toBe(false);
            expect(Emm.exitApp).not.toHaveBeenCalled();
        });

        test('should not reject and should clear the flag when the device check throws', async () => {
            jest.mocked(Emm.isDeviceSecured).mockRejectedValue(rejectWith(AuthenticationOutcome.Indeterminate));

            await expect(ManagedApp.handleDeviceAuthentication()).resolves.toBe(false);

            // A latched flag would permanently disable the MDM PIN policy.
            expect(ManagedApp.performingAuthentication).toBe(false);
            expect(alerts.showAuthenticationInterruptedAlert).toHaveBeenCalled();
        });

        test('should exit when the device is not secured', async () => {
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(false);

            await expect(ManagedApp.handleDeviceAuthentication()).resolves.toBe(false);

            expect(alerts.showNotSecuredAlert).toHaveBeenCalledWith('', 'Mattermost', 'en', true);
            expect(Emm.exitApp).toHaveBeenCalled();
        });

        test('should exit when authentication genuinely fails', async () => {
            jest.mocked(Emm.authenticate).mockRejectedValue(rejectWith(AuthenticationOutcome.Failed));

            await expect(ManagedApp.handleDeviceAuthentication()).resolves.toBe(false);

            expect(Emm.exitApp).toHaveBeenCalled();
            expect(alerts.showAuthenticationInterruptedAlert).not.toHaveBeenCalled();
        });

        test('should offer a retry instead of exiting when authentication is cancelled', async () => {
            jest.mocked(Emm.authenticate).mockRejectedValue(rejectWith(AuthenticationOutcome.Cancelled));

            await expect(ManagedApp.handleDeviceAuthentication()).resolves.toBe(false);

            expect(alerts.showAuthenticationInterruptedAlert).toHaveBeenCalled();
            expect(Emm.exitApp).not.toHaveBeenCalled();
            expect(ManagedApp.performingAuthentication).toBe(false);
        });

        test('should retry the prompt when the interrupted alert returns retry', async () => {
            jest.mocked(Emm.authenticate).
                mockRejectedValueOnce(rejectWith(AuthenticationOutcome.Cancelled)).
                mockResolvedValueOnce(true);
            jest.mocked(alerts.showAuthenticationInterruptedAlert).mockResolvedValueOnce('retry');

            await expect(ManagedApp.handleDeviceAuthentication()).resolves.toBe(true);

            expect(Emm.authenticate).toHaveBeenCalledTimes(2);
        });

        test('should only run the device check when authentication has not expired', async () => {
            await expect(ManagedApp.handleDeviceAuthentication(false)).resolves.toBe(true);

            expect(Emm.isDeviceSecured).toHaveBeenCalled();
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });
    });

    describe('onAppStateChange', () => {
        beforeEach(() => {
            ManagedApp.enabled = true;
            ManagedApp.inAppPinCode = true;
        });

        test('should record the time when backgrounded', async () => {
            ManagedApp.previousAppState = 'active';

            await ManagedApp.onAppStateChange('background');

            expect(ManagedApp.backgroundSince).toBeGreaterThan(0);
        });

        test('should not start a second prompt while one is in progress', async () => {
            const backgroundSince = Date.now() - 60000;
            ManagedApp.performingAuthentication = true;
            ManagedApp.previousAppState = 'background';
            ManagedApp.backgroundSince = backgroundSince;

            await ManagedApp.onAppStateChange('active');

            expect(Emm.authenticate).not.toHaveBeenCalled();
            expect(ManagedApp.backgroundSince).toBe(backgroundSince);
        });
    });
});
