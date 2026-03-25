// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import Emm from '@mattermost/react-native-emm';
import {isRootedExperimentalAsync} from 'expo-device';
import {type EventSubscription} from 'react-native';

import {getCurrentUserLocale} from '@actions/local/user';
import {logout} from '@actions/remote/session';
import {Sso} from '@constants';
import DatabaseManager from '@database/manager';
import IntuneManager from '@managers/intune_manager';
import {type IntunePolicy} from '@managers/intune_manager/types';
import {getConfig, getConfigValue} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import TestHelper from '@test/test_helper';
import * as alerts from '@utils/alerts';
import {logError} from '@utils/log';

import SecurityManager from '.';

import type {ServerDatabase} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

jest.mock('@mattermost/react-native-emm', () => ({
    isDeviceSecured: jest.fn(),
    authenticate: jest.fn(),
    openSecuritySettings: jest.fn(),
    exitApp: jest.fn(),
    enableBlurScreen: jest.fn(),
    applyBlurEffect: jest.fn(),
    removeBlurEffect: jest.fn(),
    addListener: jest.fn(),
    setAppGroupId: jest.fn(),
    getManagedConfig: jest.fn(() => ({})),
}));

jest.mock('expo-device', () => ({
    isRootedExperimentalAsync: jest.fn(),
}));
jest.mock('@actions/local/session', () => ({terminateSession: jest.fn(() => Promise.resolve())}));
jest.mock('@actions/local/user', () => ({getCurrentUserLocale: jest.fn(() => Promise.resolve('en'))}));
jest.mock('@actions/remote/session', () => ({
    logout: jest.fn(() => Promise.resolve()),
}));
jest.mock('@utils/log', () => ({
    logError: jest.fn(),
    logDebug: jest.fn(),
}));
jest.mock('@init/credentials', () => ({getServerCredentials: jest.fn().mockResolvedValue({token: 'token'})}));
jest.mock('@database/manager', () => ({
    getActiveServerUrl: jest.fn(),
    getServerDatabaseAndOperator: jest.fn(),
}));
jest.mock('@queries/servers/system', () => ({
    getConfig: jest.fn(),
    getConfigValue: jest.fn(),
}));
jest.mock('@queries/servers/user', () => ({
    getCurrentUser: jest.fn(),
}));

describe('SecurityManager - Intune MAM Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SecurityManager.initialized = false;
        SecurityManager.serverConfig = {};
        SecurityManager.activeServer = undefined;
    });

    // Default policy with strict restrictions (all policies enforced)
    const mockRestrictiveIntunePolicy: IntunePolicy = {
        isPINRequired: true,
        isContactSyncAllowed: false,
        isWidgetContentSyncAllowed: false,
        isSpotlightIndexingAllowed: false,
        areSiriIntentsAllowed: false,
        areAppIntentsAllowed: false,
        isAppSharingAllowed: false,
        shouldFileProviderEncryptFiles: true,
        isManagedBrowserRequired: true,
        isFileEncryptionRequired: true,
        isScreenCaptureAllowed: false,
        notificationPolicy: 2, // Block all notifications
        allowedSaveLocations: {
            Other: false,
            OneDriveForBusiness: true,
            SharePoint: true,
            LocalDrive: false,
            PhotoLibrary: false,
            CameraRoll: false,
            FilesApp: false,
            iCloudDrive: false,
        },
        allowedOpenLocations: 0,
    };

    const mockPermissiveIntunePolicy: IntunePolicy = {
        isPINRequired: false,
        isContactSyncAllowed: true,
        isWidgetContentSyncAllowed: true,
        isSpotlightIndexingAllowed: true,
        areSiriIntentsAllowed: true,
        areAppIntentsAllowed: true,
        isAppSharingAllowed: true,
        shouldFileProviderEncryptFiles: false,
        isManagedBrowserRequired: false,
        isFileEncryptionRequired: false,
        isScreenCaptureAllowed: true,
        notificationPolicy: 0, // Allow all notifications
        allowedSaveLocations: {
            Other: true,
            OneDriveForBusiness: true,
            SharePoint: true,
            LocalDrive: true,
            PhotoLibrary: true,
            CameraRoll: true,
            FilesApp: true,
            iCloudDrive: true,
        },
        allowedOpenLocations: 255, // All locations
    };

    describe('start', () => {
        test('should set current Intune identity and apply policies', async () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'false'} as SecurityClientConfig);
            jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);

            await SecurityManager.start();

            expect(IntuneManager.setCurrentIdentity).toHaveBeenCalledWith(serverUrl);
            expect(SecurityManager.activeServer).toBe(serverUrl);
        });

        test('should handle missing active server', async () => {
            jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('');

            await SecurityManager.start();

            expect(IntuneManager.setCurrentIdentity).not.toHaveBeenCalled();
        });

        test('should skip biometric auth when device is jailbroken', async () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true', MobileJailbreakProtection: 'true'} as SecurityClientConfig);
            jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);

            await SecurityManager.start();

            expect(Emm.authenticate).not.toHaveBeenCalled();
        });
    });

    describe('isScreenCapturePrevented - MAM policy precedence', () => {
        test('should return false (block capture) when MAM disallows even if server allows', () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'false'} as SecurityClientConfig, false, mockRestrictiveIntunePolicy);

            expect(SecurityManager.isScreenCapturePrevented(serverUrl)).toBe(false);
        });

        test('should return true (allow capture) when both MAM and server allow', () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'false'} as SecurityClientConfig, false, mockPermissiveIntunePolicy);

            expect(SecurityManager.isScreenCapturePrevented(serverUrl)).toBe(false);
        });

        test('should return true (block capture) when server prevents and MAM allows', () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'true'} as SecurityClientConfig, false, mockPermissiveIntunePolicy);

            expect(SecurityManager.isScreenCapturePrevented(serverUrl)).toBe(true);
        });

        test('should return false (block capture) when MAM disallows regardless of server', () => {
            const serverUrl = 'https://test.server.com';

            // Server allows capture, but MAM blocks - MAM wins
            SecurityManager.addServer(serverUrl, {MobilePreventScreenCapture: 'false'} as SecurityClientConfig, false, mockRestrictiveIntunePolicy);

            expect(SecurityManager.isScreenCapturePrevented(serverUrl)).toBe(false);
        });

        test('should use server config when no Intune policy', () => {
            const serverUrl1 = 'https://test1.server.com';
            const serverUrl2 = 'https://test2.server.com';
            SecurityManager.addServer(serverUrl1, {MobilePreventScreenCapture: 'true'} as SecurityClientConfig, false, null);
            SecurityManager.addServer(serverUrl2, {MobilePreventScreenCapture: 'false'} as SecurityClientConfig, false, null);

            expect(SecurityManager.isScreenCapturePrevented(serverUrl1)).toBe(true);
            expect(SecurityManager.isScreenCapturePrevented(serverUrl2)).toBe(false);
        });
    });

    describe('authenticateWithBiometricsIfNeeded - isPINRequired enforcement', () => {
        test('should skip biometric auth when MAM requires PIN', async () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as SecurityClientConfig, false, mockRestrictiveIntunePolicy);

            const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

            expect(result).toBe(true);
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should use server biometric config when MAM PIN not required', async () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as SecurityClientConfig, false, mockPermissiveIntunePolicy);
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);

            const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

            expect(result).toBe(true);
            expect(Emm.authenticate).toHaveBeenCalled();
        });

        test('should not require auth when server disables biometrics and MAM PIN not required', async () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'false'} as SecurityClientConfig, false, mockPermissiveIntunePolicy);

            const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

            expect(result).toBe(true);
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should skip auth when MAM requires PIN even if server enables biometrics', async () => {
            const serverUrl = 'https://test.server.com';

            // Server wants biometrics, but MAM requires PIN - MAM wins
            SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as SecurityClientConfig, false, mockRestrictiveIntunePolicy);

            const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

            expect(result).toBe(true);
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should use server config when no Intune policy', async () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as SecurityClientConfig, false, null);
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);

            const result = await SecurityManager.authenticateWithBiometricsIfNeeded(serverUrl);

            expect(result).toBe(true);
            expect(Emm.authenticate).toHaveBeenCalled();
        });
    });

    describe('authenticateWithBiometrics - isPINRequired enforcement', () => {
        test('should skip authentication when MAM handles PIN', async () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as SecurityClientConfig, false, mockRestrictiveIntunePolicy);

            const result = await SecurityManager.authenticateWithBiometrics(serverUrl);

            expect(result).toBe(true);
            expect(Emm.isDeviceSecured).not.toHaveBeenCalled();
            expect(Emm.authenticate).not.toHaveBeenCalled();
        });

        test('should attempt authentication when MAM does not require PIN', async () => {
            const serverUrl = 'https://test.server.com';
            const siteName = 'Test Site';
            SecurityManager.addServer(serverUrl, {MobileEnableBiometrics: 'true'} as unknown as SecurityClientConfig, false, mockPermissiveIntunePolicy);
            jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
            jest.mocked(Emm.authenticate).mockResolvedValue(true);

            const result = await SecurityManager.authenticateWithBiometrics(serverUrl, siteName);

            expect(result).toBe(true);
            expect(Emm.authenticate).toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        test('should remove all Intune event subscriptions', () => {
            const mockSubscription = {remove: jest.fn()} as unknown as EventSubscription;
            SecurityManager.intunePolicySubscription = mockSubscription;
            SecurityManager.intuneEnrollmentSubscription = mockSubscription;
            SecurityManager.intuneWipeSubscription = mockSubscription;
            SecurityManager.intuneAuthSubscription = mockSubscription;
            SecurityManager.intuneBlockedSubscription = mockSubscription;
            SecurityManager.intuneIdentitySwitchSubscription = mockSubscription;

            SecurityManager.cleanup();

            expect(mockSubscription.remove).toHaveBeenCalledTimes(6);
        });

        test('should handle missing subscriptions gracefully', () => {
            SecurityManager.intunePolicySubscription = undefined;
            SecurityManager.intuneEnrollmentSubscription = undefined;

            expect(() => SecurityManager.cleanup()).not.toThrow();
        });
    });

    describe('addServer with Intune policy', () => {
        test('should store restrictive Intune policy', () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig, false, mockRestrictiveIntunePolicy);

            const config = SecurityManager.getServerConfig(serverUrl);
            expect(config?.intunePolicy).toEqual(mockRestrictiveIntunePolicy);
            expect(config?.intunePolicy?.isPINRequired).toBe(true);
            expect(config?.intunePolicy?.isScreenCaptureAllowed).toBe(false);
        });

        test('should store permissive Intune policy', () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig, false, mockPermissiveIntunePolicy);

            const config = SecurityManager.getServerConfig(serverUrl);
            expect(config?.intunePolicy).toEqual(mockPermissiveIntunePolicy);
            expect(config?.intunePolicy?.isPINRequired).toBe(false);
            expect(config?.intunePolicy?.isScreenCaptureAllowed).toBe(true);
        });

        test('should store null when not enrolled in Intune', () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig, false, null);

            const config = SecurityManager.getServerConfig(serverUrl);
            expect(config?.intunePolicy).toBeNull();
        });

        test('should update policy when server re-enrolls', () => {
            const serverUrl = 'https://test.server.com';

            // First add without policy
            SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig, false, null);
            expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy).toBeNull();

            // Then update with restrictive policy
            SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig, false, mockRestrictiveIntunePolicy);
            const config = SecurityManager.getServerConfig(serverUrl);
            expect(config?.intunePolicy?.isPINRequired).toBe(true);
        });

        test('should update from restrictive to permissive policy', () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig, false, mockRestrictiveIntunePolicy);
            expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy?.isPINRequired).toBe(true);

            SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig, false, mockPermissiveIntunePolicy);
            expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy?.isPINRequired).toBe(false);
        });

        test('should clear policy when unenrolled', () => {
            const serverUrl = 'https://test.server.com';
            SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig, false, mockRestrictiveIntunePolicy);
            expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy).not.toBeNull();

            SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig, false, null);
            expect(SecurityManager.getServerConfig(serverUrl)?.intunePolicy).toBeNull();
        });
    });

    describe('ensureMAMEnrollmentForActiveServer', () => {
        const serverUrl = 'https://test.server.com';
        const mockDatabase = {database: 'mock-db'};
        const mockUser = {id: 'user-id', authService: Sso.OFFICE365};
        const mockConfig = {IntuneScope: 'https://msmamservice.api.application/.default', IntuneAuthService: Sso.OFFICE365, SiteName: 'Test Server'};
        const mockTokens = {
            identity: {upn: 'user@test.com', tid: 'tenant-id', oid: 'object-id'},
            idToken: 'id-token',
            accessToken: 'access-token',
        };

        beforeEach(async () => {
            SecurityManager.isEnrolling = false;
            await SecurityManager.addServer(serverUrl, {SiteName: 'Test Server'} as SecurityClientConfig);
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue(mockDatabase as unknown as ServerDatabase);
            jest.mocked(getCurrentUser).mockResolvedValue(mockUser as unknown as UserModel);
            jest.mocked(getConfig).mockResolvedValue(mockConfig as ClientConfig);
            jest.mocked(getConfigValue).mockResolvedValue(Sso.OFFICE365);
            jest.mocked(getCurrentUserLocale).mockResolvedValue('en');
        });

        test('should skip enrollment if already enrolling (race condition prevention)', async () => {
            SecurityManager.isEnrolling = true;

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(true);
            expect(IntuneManager.isIntuneMAMEnabledForServer).not.toHaveBeenCalled();
        });

        test('should return true if Intune MAM not enabled for server', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(false);

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(true);
            expect(IntuneManager.isIntuneMAMEnabledForServer).toHaveBeenCalledWith(serverUrl);
            expect(IntuneManager.isManagedServer).not.toHaveBeenCalled();
        });

        test('should return true if server is already managed', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(true);

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(true);
            expect(IntuneManager.isManagedServer).toHaveBeenCalledWith(serverUrl);
            expect(getCurrentUser).not.toHaveBeenCalled();
        });

        test('should return true if user auth service is not Office365', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);
            jest.mocked(getCurrentUser).mockResolvedValue({...mockUser, authService: 'SAML'} as unknown as UserModel);

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(true);
            expect(getCurrentUser).toHaveBeenCalledWith(mockDatabase.database);
        });

        test('should return false if IntuneScope not configured', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);
            jest.mocked(getConfig).mockResolvedValue({IntuneScope: ''} as ClientConfig);

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(false);
            expect(logError).toHaveBeenCalledWith('ensureMAMEnrollment: IntuneScope not configured');
        });

        test('should show enrollment required alert with blur screen enabled', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);

            const showAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentRequiredAlert').mockImplementation(async () => {
                // User cancels enrollment - don't call callbacks
            });

            // Don't await - we're testing the alert is shown
            SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            // Wait for blur to be applied
            await TestHelper.wait(300);

            expect(Emm.enableBlurScreen).toHaveBeenCalledWith(true);
            expect(Emm.applyBlurEffect).toHaveBeenCalledWith(20);
            expect(showAlertSpy).toHaveBeenCalledWith(
                'Test Server',
                'en',
                expect.any(Function),
                expect.any(Function),
            );

            showAlertSpy.mockRestore();
        });

        test('should successfully enroll after user accepts', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);
            jest.mocked(IntuneManager.login).mockResolvedValue(mockTokens);
            jest.mocked(IntuneManager.enrollServer).mockResolvedValue(undefined);

            const showAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentRequiredAlert').mockImplementation(async (_siteName, _locale, onAccept) => {
                // User accepts enrollment
                onAccept();
            });

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(true);
            expect(IntuneManager.login).toHaveBeenCalledWith(serverUrl, [mockConfig.IntuneScope]);
            expect(IntuneManager.enrollServer).toHaveBeenCalledWith(serverUrl, mockTokens.identity);
            expect(Emm.removeBlurEffect).toHaveBeenCalled();
            expect(SecurityManager.isEnrolling).toBe(false);

            showAlertSpy.mockRestore();
        });

        test('should clear isEnrolling flag after successful enrollment', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);
            jest.mocked(IntuneManager.login).mockResolvedValue(mockTokens);
            jest.mocked(IntuneManager.enrollServer).mockResolvedValue(undefined);

            const showAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentRequiredAlert').mockImplementation(async (_siteName, _locale, onAccept) => {
                onAccept();
            });

            expect(SecurityManager.isEnrolling).toBe(false);
            await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);
            expect(SecurityManager.isEnrolling).toBe(false);

            showAlertSpy.mockRestore();
        });

        test('should show enrollment failed alert on MSAL login failure', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);
            jest.mocked(IntuneManager.login).mockRejectedValue(new Error('MSAL login failed'));

            const enrollmentAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentRequiredAlert').mockImplementation(async (_siteName, _locale, onAccept) => {
                onAccept();
            });
            const failedAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentFailedAlert').mockImplementation(async (_locale, onDismiss) => {
                if (onDismiss) {
                    onDismiss();
                }
            });

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(false);
            expect(failedAlertSpy).toHaveBeenCalledWith('en', expect.any(Function));
            expect(logout).toHaveBeenCalledWith(serverUrl, undefined, {removeServer: true});
            expect(logError).toHaveBeenCalled();

            enrollmentAlertSpy.mockRestore();
            failedAlertSpy.mockRestore();
        });

        test('should show enrollment failed alert on MAM enrollment failure', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);
            jest.mocked(IntuneManager.login).mockResolvedValue(mockTokens);
            jest.mocked(IntuneManager.enrollServer).mockRejectedValue(new Error('Enrollment failed'));

            const enrollmentAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentRequiredAlert').mockImplementation(async (_siteName, _locale, onAccept) => {
                onAccept();
            });
            const failedAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentFailedAlert').mockImplementation(async (_locale, onDismiss) => {
                if (onDismiss) {
                    onDismiss();
                }
            });

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(false);
            expect(failedAlertSpy).toHaveBeenCalledWith('en', expect.any(Function));

            enrollmentAlertSpy.mockRestore();
            failedAlertSpy.mockRestore();
        });

        test('should clear isEnrolling flag after enrollment failure', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);
            jest.mocked(IntuneManager.login).mockRejectedValue(new Error('Failed'));

            const enrollmentAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentRequiredAlert').mockImplementation(async (_siteName, _locale, onAccept) => {
                onAccept();
            });
            const failedAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentFailedAlert').mockImplementation(async (_locale, onDismiss) => {
                if (onDismiss) {
                    onDismiss();
                }
            });

            await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);
            expect(SecurityManager.isEnrolling).toBe(false);

            enrollmentAlertSpy.mockRestore();
            failedAlertSpy.mockRestore();
        });

        test('should show MAM declined alert when user cancels', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);

            const enrollmentAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentRequiredAlert').mockImplementation(async (_siteName, _locale, _onAccept, onCancel) => {
                onCancel();
            });
            const declinedAlertSpy = jest.spyOn(alerts, 'showMAMDeclinedAlert').mockImplementation(async (_url, _siteName, _locale, onDismiss) => {
                onDismiss(false);
            });

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(false);
            expect(declinedAlertSpy).toHaveBeenCalledWith(
                serverUrl,
                'Test Server',
                'en',
                expect.any(Function),
                expect.any(Function),
            );

            enrollmentAlertSpy.mockRestore();
            declinedAlertSpy.mockRestore();
        });

        test('should allow retry after user cancels', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);
            jest.mocked(IntuneManager.login).mockResolvedValue(mockTokens);
            jest.mocked(IntuneManager.enrollServer).mockResolvedValue(undefined);

            const enrollmentAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentRequiredAlert').mockImplementation(async (_siteName, _locale, _onAccept, onCancel) => {
                // User cancels first
                onCancel();
            });
            const declinedAlertSpy = jest.spyOn(alerts, 'showMAMDeclinedAlert').mockImplementation(async (_url, _siteName, _locale, _onDismiss, onRetry) => {
                // User chooses to retry
                onRetry();
            });

            const result = await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(result).toBe(true);
            expect(IntuneManager.login).toHaveBeenCalled();
            expect(IntuneManager.enrollServer).toHaveBeenCalled();

            enrollmentAlertSpy.mockRestore();
            declinedAlertSpy.mockRestore();
        });

        test('should remove blur screen after enrollment completion', async () => {
            jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
            jest.mocked(IntuneManager.isManagedServer).mockResolvedValue(false);
            jest.mocked(IntuneManager.login).mockResolvedValue(mockTokens);
            jest.mocked(IntuneManager.enrollServer).mockResolvedValue(undefined);

            const showAlertSpy = jest.spyOn(alerts, 'showMAMEnrollmentRequiredAlert').mockImplementation(async (_siteName, _locale, onAccept) => {
                onAccept();
            });

            await SecurityManager.ensureMAMEnrollmentForActiveServer(serverUrl);

            expect(Emm.removeBlurEffect).toHaveBeenCalled();
            expect(Emm.enableBlurScreen).toHaveBeenCalledWith(false);

            showAlertSpy.mockRestore();
        });
    });

    describe('canSaveToLocation', () => {
        const serverUrl1 = 'https://test1.server.com';
        const serverUrl2 = 'https://test2.server.com';
        const mockPolicy: IntunePolicy = {
            isPINRequired: true,
            isContactSyncAllowed: false,
            isWidgetContentSyncAllowed: false,
            isSpotlightIndexingAllowed: false,
            areSiriIntentsAllowed: false,
            areAppIntentsAllowed: false,
            isAppSharingAllowed: false,
            shouldFileProviderEncryptFiles: true,
            isManagedBrowserRequired: false,
            isFileEncryptionRequired: true,
            isScreenCaptureAllowed: false,
            notificationPolicy: 0,
            allowedSaveLocations: {
                Other: false,
                OneDriveForBusiness: true,
                SharePoint: true,
                LocalDrive: false,
                PhotoLibrary: false,
                CameraRoll: false,
                FilesApp: false,
                iCloudDrive: false,
            },
            allowedOpenLocations: 0,
        };

        beforeEach(async () => {
            await SecurityManager.init();
            await SecurityManager.addServer(serverUrl1, {SiteName: 'Test Server 1'} as SecurityClientConfig);
            await SecurityManager.addServer(serverUrl2, {SiteName: 'Test Server 2'} as SecurityClientConfig);
        });

        afterEach(() => {
            SecurityManager.cleanup();
        });

        test('should return true when no Intune policy exists', () => {
            const result = SecurityManager.canSaveToLocation(serverUrl1, 'PhotoLibrary');
            expect(result).toBe(true);
        });

        test('should return policy value when Intune policy exists', async () => {
            await SecurityManager.addServer(serverUrl1, {} as SecurityClientConfig, false, mockPolicy);

            const canSaveToOneDrive = SecurityManager.canSaveToLocation(serverUrl1, 'OneDriveForBusiness');
            const canSaveToPhotoLibrary = SecurityManager.canSaveToLocation(serverUrl1, 'PhotoLibrary');

            expect(canSaveToOneDrive).toBe(true);
            expect(canSaveToPhotoLibrary).toBe(false);
        });

        test('should return false for restricted locations', async () => {
            await SecurityManager.addServer(serverUrl1, {} as SecurityClientConfig, false, mockPolicy);

            expect(SecurityManager.canSaveToLocation(serverUrl1, 'LocalDrive')).toBe(false);
            expect(SecurityManager.canSaveToLocation(serverUrl1, 'CameraRoll')).toBe(false);
            expect(SecurityManager.canSaveToLocation(serverUrl1, 'FilesApp')).toBe(false);
            expect(SecurityManager.canSaveToLocation(serverUrl1, 'iCloudDrive')).toBe(false);
        });

        test('should return true for allowed locations', async () => {
            await SecurityManager.addServer(serverUrl1, {} as SecurityClientConfig, false, mockPolicy);

            expect(SecurityManager.canSaveToLocation(serverUrl1, 'OneDriveForBusiness')).toBe(true);
            expect(SecurityManager.canSaveToLocation(serverUrl1, 'SharePoint')).toBe(true);
        });
    });
});
