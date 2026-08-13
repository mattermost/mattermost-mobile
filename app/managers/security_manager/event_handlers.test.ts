// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import Emm from '@mattermost/react-native-emm';
import {isRootedExperimentalAsync} from 'expo-device';
import {type AppStateStatus} from 'react-native';

import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import IntuneManager from '@managers/intune_manager';
import {
    IntuneConditionalLaunchBlockedReasons,
    type IntuneAuthRequiredEvent,
    type IntuneConditionalLaunchBlockedEvent,
    type IntuneEnrollmentChangedEvent,
    type IntuneIdentitySwitchRequiredEvent,
    type IntunePolicy,
    type IntunePolicyChangedEvent,
    type IntuneWipeRequestedEvent,
} from '@managers/intune_manager/types';
import TestHelper from '@test/test_helper';
import * as alerts from '@utils/alerts';
import {toMilliseconds} from '@utils/datetime';

import SecurityManager from './index';

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
jest.mock('@utils/datetime', () => ({toMilliseconds: jest.fn(() => 25000)}));
jest.mock('@init/credentials', () => ({getServerCredentials: jest.fn().mockResolvedValue({token: 'token'})}));
jest.mock('@database/manager', () => ({
    getActiveServerUrl: jest.fn(),
    getServerDatabaseAndOperator: jest.fn(),
}));

describe('SecurityManager - Event Handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SecurityManager.initialized = false;
        SecurityManager.serverConfig = {};
        SecurityManager.activeServer = undefined;
    });

    describe('onAppStateChange', () => {
        test('should handle app state changes', async () => {
            await SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'true'} as SecurityClientConfig);
            await SecurityManager.setActiveServer({serverUrl: 'server-8'});
            await SecurityManager.onAppStateChange('background' as AppStateStatus);
            expect(SecurityManager.backgroundSince).toBeGreaterThan(0);
            await SecurityManager.onAppStateChange('active' as AppStateStatus);
            expect(SecurityManager.backgroundSince).toBe(0);
        });

        test('should call biometric authentication app state changes', async () => {
            const authenticateWithBiometrics = jest.spyOn(SecurityManager, 'authenticateWithBiometrics');
            jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);
            await SecurityManager.addServer('server-8', {MobileEnableBiometrics: 'true'} as SecurityClientConfig);
            await SecurityManager.setActiveServer({serverUrl: 'server-8'});
            SecurityManager.onAppStateChange('background' as AppStateStatus);
            SecurityManager.backgroundSince = Date.now() - toMilliseconds({minutes: 5, seconds: 1});
            SecurityManager.onAppStateChange('active' as AppStateStatus);
            await TestHelper.wait(300);
            expect(authenticateWithBiometrics).toHaveBeenCalledWith('server-8');
        });
    });

    describe('Intune Event Handlers', () => {
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

        describe('onIntunePolicyChanged', () => {
            test('should skip if not initialized', () => {
                SecurityManager.cleanup();
                const event: IntunePolicyChangedEvent = {
                    oid: 'object-id',
                    changed: true,
                    removed: false,
                    policy: mockPolicy,
                    serverUrls: [serverUrl1],
                };

                SecurityManager.onIntunePolicyChanged(event);

                // After cleanup, handler should return early without modifying config
                // Server still exists with null policy (from addServer)
                const config = SecurityManager.getServerConfig(serverUrl1);
                expect(config?.intunePolicy).toBeUndefined();
            });

            test('should update policy for affected servers when policy changed', () => {
                const event: IntunePolicyChangedEvent = {
                    oid: 'object-id',
                    changed: true,
                    removed: false,
                    policy: mockPolicy,
                    serverUrls: [serverUrl1, serverUrl2],
                };

                SecurityManager.onIntunePolicyChanged(event);

                const config1 = SecurityManager.getServerConfig(serverUrl1);
                const config2 = SecurityManager.getServerConfig(serverUrl2);
                expect(config1?.intunePolicy).toEqual(mockPolicy);
                expect(config2?.intunePolicy).toEqual(mockPolicy);
            });

            test('should remove policy when policy removed', () => {
                // First set a policy
                SecurityManager.addServer(serverUrl1, {} as SecurityClientConfig, false, mockPolicy);

                const event: IntunePolicyChangedEvent = {
                    oid: 'object-id',
                    changed: false,
                    removed: true,
                    policy: null,
                    serverUrls: [serverUrl1],
                };

                SecurityManager.onIntunePolicyChanged(event);

                const config = SecurityManager.getServerConfig(serverUrl1);
                expect(config?.intunePolicy).toBeNull();
            });

            test('should re-apply screen capture policy when active server affected', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');

                const event: IntunePolicyChangedEvent = {
                    oid: 'object-id',
                    changed: true,
                    removed: false,
                    policy: mockPolicy,
                    serverUrls: [serverUrl1],
                };

                SecurityManager.onIntunePolicyChanged(event);

                expect(setScreenCaptureSpy).toHaveBeenCalledWith(serverUrl1);
                setScreenCaptureSpy.mockRestore();
            });

            test('should not re-apply when active server not affected', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');
                setScreenCaptureSpy.mockClear();

                const event: IntunePolicyChangedEvent = {
                    oid: 'object-id',
                    changed: true,
                    removed: false,
                    policy: mockPolicy,
                    serverUrls: [serverUrl2],
                };

                SecurityManager.onIntunePolicyChanged(event);

                // Should not be called again for serverUrl1
                expect(setScreenCaptureSpy).not.toHaveBeenCalled();
                setScreenCaptureSpy.mockRestore();
            });

            test('should handle multiple servers in event', () => {
                const event: IntunePolicyChangedEvent = {
                    oid: 'object-id',
                    changed: true,
                    removed: false,
                    policy: mockPolicy,
                    serverUrls: [serverUrl1, serverUrl2],
                };

                SecurityManager.onIntunePolicyChanged(event);

                const config1 = SecurityManager.getServerConfig(serverUrl1);
                const config2 = SecurityManager.getServerConfig(serverUrl2);
                expect(config1?.intunePolicy).toEqual(mockPolicy);
                expect(config2?.intunePolicy).toEqual(mockPolicy);
            });
        });

        describe('onEnrollmentChanged', () => {
            test('should call handleEnrollmentSuccess when enrolled', async () => {
                const handleSuccessSpy = jest.spyOn(SecurityManager as any, 'handleEnrollmentSuccess');
                const event: IntuneEnrollmentChangedEvent = {
                    oid: 'object-id',
                    enrolled: true,
                    reason: 'user_enrolled',
                    serverUrls: [serverUrl1],
                };

                SecurityManager.onEnrollmentChanged(event);

                await TestHelper.wait(10);
                expect(handleSuccessSpy).toHaveBeenCalledWith([serverUrl1]);
                handleSuccessSpy.mockRestore();
            });

            test('should call handleUnenrollment when not enrolled', async () => {
                const handleUnenrollmentSpy = jest.spyOn(SecurityManager as any, 'handleUnenrollment');
                const event: IntuneEnrollmentChangedEvent = {
                    oid: 'object-id',
                    enrolled: false,
                    reason: 'user_unenrolled',
                    serverUrls: [serverUrl1],
                };

                SecurityManager.onEnrollmentChanged(event);

                await TestHelper.wait(10);
                expect(handleUnenrollmentSpy).toHaveBeenCalledWith([serverUrl1], 'user_unenrolled');
                handleUnenrollmentSpy.mockRestore();
            });
        });

        describe('onWipeRequested', () => {
            beforeEach(() => {
                jest.mocked(getServerCredentials).mockResolvedValue({serverUrl: serverUrl1, userId: 'user-id', token: 'token'});
            });

            test('should wipe background servers first, then active server', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const performWipeSpy = jest.spyOn(SecurityManager as any, 'performSelectiveWipe').mockResolvedValue(undefined);

                const event: IntuneWipeRequestedEvent = {
                    oid: 'object-id',
                    serverUrls: [serverUrl1, serverUrl2],
                };

                await SecurityManager.onWipeRequested(event);

                // Background server wiped first with skipEvents=true
                expect(performWipeSpy).toHaveBeenCalledWith(serverUrl2, true);

                // Active server wiped last with skipEvents=false
                expect(performWipeSpy).toHaveBeenCalledWith(serverUrl1, false);

                performWipeSpy.mockRestore();
            });

            test('should proceed with wipe even without credentials (already deleted by native)', async () => {
                jest.mocked(getServerCredentials).mockResolvedValue(null);
                const performWipeSpy = jest.spyOn(SecurityManager as any, 'performSelectiveWipe').mockResolvedValue(true);

                const event: IntuneWipeRequestedEvent = {
                    oid: 'object-id',
                    serverUrls: [serverUrl1],
                };

                await SecurityManager.onWipeRequested(event);

                // Should still call wipe to clean up database (credentials already deleted by native)
                expect(performWipeSpy).toHaveBeenCalledWith(serverUrl1, true);
                performWipeSpy.mockRestore();
            });

            test('should remove active server after wipe', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                jest.spyOn(SecurityManager as any, 'performSelectiveWipe').mockResolvedValue(undefined);
                const removeServerSpy = jest.spyOn(SecurityManager, 'removeServer');

                const event: IntuneWipeRequestedEvent = {
                    oid: 'object-id',
                    serverUrls: [serverUrl1],
                };

                await SecurityManager.onWipeRequested(event);

                expect(removeServerSpy).toHaveBeenCalledWith(serverUrl1);
                removeServerSpy.mockRestore();
            });
        });

        describe('onAuthRequired', () => {
            test('should apply blur screen and trigger wipe', async () => {
                const showAlertSpy = jest.spyOn(alerts, 'showAuthenticationRequiredAlert').mockImplementation(async (_reason, _locale, onDismiss) => {
                    if (onDismiss) {
                        onDismiss();
                    }
                });
                const performWipeSpy = jest.spyOn(SecurityManager as any, 'performSelectiveWipe').mockResolvedValue(undefined);

                const event: IntuneAuthRequiredEvent = {
                    oid: 'object-id',
                    serverUrls: [serverUrl1],
                };

                await SecurityManager.onAuthRequired(event);

                expect(Emm.applyBlurEffect).toHaveBeenCalled();
                expect(showAlertSpy).toHaveBeenCalled();
                await TestHelper.wait(10);
                expect(performWipeSpy).toHaveBeenCalledWith(serverUrl1, true);
                expect(Emm.removeBlurEffect).toHaveBeenCalled();

                showAlertSpy.mockRestore();
                performWipeSpy.mockRestore();
            });

            test('should remove blur screen when alert dismissed', async () => {
                const showAlertSpy = jest.spyOn(alerts, 'showAuthenticationRequiredAlert').mockImplementation(async (_reason, _locale, onDismiss) => {
                    if (onDismiss) {
                        onDismiss();
                    }
                });

                const event: IntuneAuthRequiredEvent = {
                    oid: 'object-id',
                    serverUrls: [serverUrl1],
                };

                await SecurityManager.onAuthRequired(event);

                expect(Emm.applyBlurEffect).toHaveBeenCalled();
                await TestHelper.wait(10);
                expect(Emm.removeBlurEffect).toHaveBeenCalled();

                showAlertSpy.mockRestore();
            });
        });

        describe('onConditionalLaunchBlocked', () => {
            test('should trigger wipe when launch blocked', async () => {
                const showAlertSpy = jest.spyOn(alerts, 'showConditionalAccessAlert').mockImplementation(async (_locale, callback) => {
                    if (callback) {
                        callback();
                    }
                });
                const performWipeSpy = jest.spyOn(SecurityManager as any, 'performSelectiveWipe').mockResolvedValue(undefined);

                const event: IntuneConditionalLaunchBlockedEvent = {
                    oid: 'object-id',
                    reason: IntuneConditionalLaunchBlockedReasons.LAUNCH_BLOCKED,
                    serverUrls: [serverUrl1],
                };

                await SecurityManager.onConditionalLaunchBlocked(event);

                expect(Emm.applyBlurEffect).toHaveBeenCalled();
                expect(showAlertSpy).toHaveBeenCalled();
                await TestHelper.wait(10);
                expect(performWipeSpy).toHaveBeenCalledWith(serverUrl1, true);

                showAlertSpy.mockRestore();
                performWipeSpy.mockRestore();
            });

            test('should remove blur screen when launch blocked alert dismissed', async () => {
                const showAlertSpy = jest.spyOn(alerts, 'showConditionalAccessAlert').mockImplementation(async (_locale, callback) => {
                    if (callback) {
                        callback();
                    }
                });

                const event: IntuneConditionalLaunchBlockedEvent = {
                    oid: 'object-id',
                    reason: IntuneConditionalLaunchBlockedReasons.LAUNCH_BLOCKED,
                    serverUrls: [serverUrl1],
                };

                await SecurityManager.onConditionalLaunchBlocked(event);

                await TestHelper.wait(10);
                expect(Emm.removeBlurEffect).toHaveBeenCalled();

                showAlertSpy.mockRestore();
            });

            test('should retry authentication when launch canceled', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});

                const showAlertSpy = jest.spyOn(alerts, 'showBiometricFailureAlertForOrganization').mockImplementation(async (_server, _locale, retryCallback) => {
                    if (retryCallback) {
                        await retryCallback();
                    }
                });
                const setIdentitySpy = jest.spyOn(IntuneManager, 'setCurrentIdentity').mockResolvedValue(undefined);

                const event: IntuneConditionalLaunchBlockedEvent = {
                    oid: 'object-id',
                    reason: IntuneConditionalLaunchBlockedReasons.LAUNCH_CANCELED,
                    serverUrls: [serverUrl1],
                };

                await SecurityManager.onConditionalLaunchBlocked(event);

                expect(showAlertSpy).toHaveBeenCalled();
                expect(setIdentitySpy).toHaveBeenCalledWith(serverUrl1);

                showAlertSpy.mockRestore();
                setIdentitySpy.mockRestore();
            });

            test('should remove blur screen after retry', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});

                const showAlertSpy = jest.spyOn(alerts, 'showBiometricFailureAlertForOrganization').mockImplementation(async (_server, _locale, retryCallback) => {
                    if (retryCallback) {
                        await retryCallback();
                    }
                });
                jest.spyOn(IntuneManager, 'setCurrentIdentity').mockResolvedValue(undefined);

                const event: IntuneConditionalLaunchBlockedEvent = {
                    oid: 'object-id',
                    reason: IntuneConditionalLaunchBlockedReasons.LAUNCH_CANCELED,
                    serverUrls: [serverUrl1],
                };

                await SecurityManager.onConditionalLaunchBlocked(event);

                expect(Emm.removeBlurEffect).toHaveBeenCalled();

                showAlertSpy.mockRestore();
            });
        });

        describe('onIdentitySwitchRequired', () => {
            test('should trigger wipe and show alert', async () => {
                const showAlertSpy = jest.spyOn(alerts, 'showIdentitySwitchRequiredAlert').mockResolvedValue(undefined);
                const performWipeSpy = jest.spyOn(SecurityManager as any, 'performSelectiveWipe').mockResolvedValue(undefined);

                const event: IntuneIdentitySwitchRequiredEvent = {
                    oid: 'object-id',
                    serverUrls: [serverUrl1],
                    reason: 'new_identity_required',
                };

                await SecurityManager.onIdentitySwitchRequired(event);

                expect(showAlertSpy).toHaveBeenCalled();
                await TestHelper.wait(10);
                expect(performWipeSpy).toHaveBeenCalledWith(serverUrl1, true);

                showAlertSpy.mockRestore();
                performWipeSpy.mockRestore();
            });
        });

        describe('handleEnrollmentSuccess', () => {
            beforeEach(() => {
                jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl1);
                jest.mocked(IntuneManager.getPolicy).mockResolvedValue(mockPolicy);
            });

            test('should fetch and update policy for all affected servers', async () => {
                await (SecurityManager as any).handleEnrollmentSuccess([serverUrl1, serverUrl2]);

                const config1 = SecurityManager.getServerConfig(serverUrl1);
                const config2 = SecurityManager.getServerConfig(serverUrl2);
                expect(config1?.intunePolicy).toEqual(mockPolicy);
                expect(config2?.intunePolicy).toEqual(mockPolicy);
            });

            test('should set current identity if active server is affected', async () => {
                await (SecurityManager as any).handleEnrollmentSuccess([serverUrl1, serverUrl2]);

                expect(IntuneManager.setCurrentIdentity).toHaveBeenCalledWith(serverUrl1);
            });

            test('should re-apply screen capture policy for active server', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');

                await (SecurityManager as any).handleEnrollmentSuccess([serverUrl1]);

                expect(setScreenCaptureSpy).toHaveBeenCalledWith(serverUrl1);
                setScreenCaptureSpy.mockRestore();
            });

            test('should not set current identity if active server not affected', async () => {
                jest.mocked(IntuneManager.setCurrentIdentity).mockClear();

                await (SecurityManager as any).handleEnrollmentSuccess([serverUrl2]);

                expect(IntuneManager.setCurrentIdentity).not.toHaveBeenCalled();
            });
        });

        describe('handleUnenrollment', () => {
            beforeEach(async () => {
                await SecurityManager.addServer(serverUrl1, {} as SecurityClientConfig, false, mockPolicy);
                await SecurityManager.addServer(serverUrl2, {} as SecurityClientConfig, false, mockPolicy);
                jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl1);
            });

            test('should remove intunePolicy from all affected servers', async () => {
                await (SecurityManager as any).handleUnenrollment([serverUrl1, serverUrl2], 'admin_unenrolled');

                const config1 = SecurityManager.getServerConfig(serverUrl1);
                const config2 = SecurityManager.getServerConfig(serverUrl2);
                expect(config1?.intunePolicy).toBeNull();
                expect(config2?.intunePolicy).toBeNull();
            });

            test('should re-apply screen capture policy if active server affected', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');

                await (SecurityManager as any).handleUnenrollment([serverUrl1], 'policy_removed');

                expect(setScreenCaptureSpy).toHaveBeenCalledWith(serverUrl1);
                setScreenCaptureSpy.mockRestore();
            });

            test('should not re-apply if active server not affected', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');
                setScreenCaptureSpy.mockClear();

                await (SecurityManager as any).handleUnenrollment([serverUrl2]);

                expect(setScreenCaptureSpy).not.toHaveBeenCalled();
                setScreenCaptureSpy.mockRestore();
            });
        });

        describe('onConfigChanged', () => {
            const mockConfig = {
                SiteName: 'Updated Server',
                MobileEnableBiometrics: 'true',
                MobileJailbreakProtection: 'true',
                MobilePreventScreenCapture: 'true',
            } as SecurityClientConfig;

            beforeEach(() => {
                jest.mocked(IntuneManager.getPolicy).mockResolvedValue(mockPolicy);
            });

            test('should update server config when config changes', async () => {
                await SecurityManager.onConfigChanged({serverUrl: serverUrl1, config: mockConfig});

                const config = SecurityManager.getServerConfig(serverUrl1);
                expect(config?.siteName).toBe('Updated Server');
                expect(config?.Biometrics).toBe(true);
                expect(config?.JailbreakProtection).toBe(true);
                expect(config?.PreventScreenCapture).toBe(true);
            });

            test('should fetch and store Intune policy when config changes', async () => {
                await SecurityManager.onConfigChanged({serverUrl: serverUrl1, config: mockConfig});

                const config = SecurityManager.getServerConfig(serverUrl1);
                expect(config?.intunePolicy).toEqual(mockPolicy);
                expect(IntuneManager.getPolicy).toHaveBeenCalledWith(serverUrl1);
            });

            test('should preserve existing config fields when updating', async () => {
                await SecurityManager.addServer(serverUrl1, {} as SecurityClientConfig, true);
                SecurityManager.serverConfig[serverUrl1].lastAccessed = 12345;

                await SecurityManager.onConfigChanged({serverUrl: serverUrl1, config: mockConfig});

                const config = SecurityManager.getServerConfig(serverUrl1);
                expect(config?.lastAccessed).toBe(12345);
                expect(config?.authenticated).toBe(true);
            });

            test('should trigger MAM enrollment check for active server', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const ensureMAMSpy = jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer').mockResolvedValue(true);

                await SecurityManager.onConfigChanged({serverUrl: serverUrl1, config: mockConfig});

                expect(ensureMAMSpy).toHaveBeenCalledWith(serverUrl1);
                ensureMAMSpy.mockRestore();
            });

            test('should apply screen capture policy for active server after enrollment check', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer').mockResolvedValue(true);
                const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');

                await SecurityManager.onConfigChanged({serverUrl: serverUrl1, config: mockConfig});

                expect(setScreenCaptureSpy).toHaveBeenCalledWith(serverUrl1);
                setScreenCaptureSpy.mockRestore();
            });

            test('should not trigger enrollment for non-active server', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const ensureMAMSpy = jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer');

                await SecurityManager.onConfigChanged({serverUrl: serverUrl2, config: mockConfig});

                expect(ensureMAMSpy).not.toHaveBeenCalled();
                ensureMAMSpy.mockRestore();
            });
        });

        describe('onLicenseChanged', () => {
            const mockLicense = {
                IsLicensed: 'true',
                SkuShortName: 'enterprise',
            } as ClientLicense;

            beforeEach(() => {
                jest.mocked(IntuneManager.getPolicy).mockResolvedValue(mockPolicy);
            });

            test('should create server config if not exists', async () => {
                await SecurityManager.onLicenseChanged({serverUrl: 'https://new-server.com', license: mockLicense});

                const config = SecurityManager.getServerConfig('https://new-server.com');
                expect(config).toBeDefined();
                expect(config?.intunePolicy).toEqual(mockPolicy);
            });

            test('should fetch and update Intune policy when license changes', async () => {
                await SecurityManager.onLicenseChanged({serverUrl: serverUrl1, license: mockLicense});

                const config = SecurityManager.getServerConfig(serverUrl1);
                expect(config?.intunePolicy).toEqual(mockPolicy);
                expect(IntuneManager.getPolicy).toHaveBeenCalledWith(serverUrl1);
            });

            test('should trigger MAM enrollment check for active server', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const ensureMAMSpy = jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer').mockResolvedValue(true);

                await SecurityManager.onLicenseChanged({serverUrl: serverUrl1, license: mockLicense});

                expect(ensureMAMSpy).toHaveBeenCalledWith(serverUrl1);
                ensureMAMSpy.mockRestore();
            });

            test('should set current identity for active server after successful enrollment', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer').mockResolvedValue(true);

                await SecurityManager.onLicenseChanged({serverUrl: serverUrl1, license: mockLicense});

                expect(IntuneManager.setCurrentIdentity).toHaveBeenCalledWith(serverUrl1);
            });

            test('should not set identity if enrollment fails', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer').mockResolvedValue(false);
                jest.mocked(IntuneManager.setCurrentIdentity).mockClear();

                await SecurityManager.onLicenseChanged({serverUrl: serverUrl1, license: mockLicense});

                expect(IntuneManager.setCurrentIdentity).not.toHaveBeenCalled();
            });

            test('should not trigger enrollment for non-active server', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const ensureMAMSpy = jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer');

                await SecurityManager.onLicenseChanged({serverUrl: serverUrl2, license: mockLicense});

                expect(ensureMAMSpy).not.toHaveBeenCalled();
                ensureMAMSpy.mockRestore();
            });
        });

        describe('canSaveToLocation', () => {
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

        describe('setActiveServer options', () => {
            beforeEach(async () => {
                jest.mocked(IntuneManager.isIntuneMAMEnabledForServer).mockResolvedValue(true);
                jest.mocked(IntuneManager.isManagedServer).mockReturnValue(false);
                jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);
                jest.mocked(Emm.isDeviceSecured).mockResolvedValue(true);
                jest.mocked(Emm.authenticate).mockResolvedValue(true);
            });

            test('should skip MAM enrollment check when skipMAMEnrollmentCheck is true', async () => {
                const ensureMAMSpy = jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer');

                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true}});

                expect(ensureMAMSpy).not.toHaveBeenCalled();
                ensureMAMSpy.mockRestore();
            });

            test('should perform MAM enrollment check when skipMAMEnrollmentCheck is false', async () => {
                const ensureMAMSpy = jest.spyOn(SecurityManager, 'ensureMAMEnrollmentForActiveServer').mockResolvedValue(true);

                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: false}});

                expect(ensureMAMSpy).toHaveBeenCalledWith(serverUrl1);
                ensureMAMSpy.mockRestore();
            });

            test('should skip jailbreak check when skipJailbreakCheck is true', async () => {
                const jailbreakSpy = jest.spyOn(SecurityManager, 'isDeviceJailbroken');

                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true}});

                expect(jailbreakSpy).not.toHaveBeenCalled();
                jailbreakSpy.mockRestore();
            });

            test('should perform jailbreak check when skipJailbreakCheck is false', async () => {
                const jailbreakSpy = jest.spyOn(SecurityManager, 'isDeviceJailbroken').mockResolvedValue(false);

                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: false}});

                expect(jailbreakSpy).toHaveBeenCalledWith(serverUrl1);
                jailbreakSpy.mockRestore();
            });

            test('should skip biometric auth when skipBiometricCheck is true', async () => {
                const biometricSpy = jest.spyOn(SecurityManager, 'authenticateWithBiometricsIfNeeded');

                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});

                expect(biometricSpy).not.toHaveBeenCalled();
                biometricSpy.mockRestore();
            });

            test('should perform biometric auth when skipBiometricCheck is false', async () => {
                const biometricSpy = jest.spyOn(SecurityManager, 'authenticateWithBiometricsIfNeeded');

                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: false}});

                expect(biometricSpy).toHaveBeenCalledWith(serverUrl1);
                biometricSpy.mockRestore();
            });

            test('should force switch to same server when forceSwitch is true', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');
                setScreenCaptureSpy.mockClear();

                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true, forceSwitch: true}});

                expect(setScreenCaptureSpy).toHaveBeenCalledWith(serverUrl1);
                setScreenCaptureSpy.mockRestore();
            });

            test('should not switch to same server when forceSwitch is false', async () => {
                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true}});
                const setScreenCaptureSpy = jest.spyOn(SecurityManager, 'setScreenCapturePolicy');
                setScreenCaptureSpy.mockClear();

                await SecurityManager.setActiveServer({serverUrl: serverUrl1, options: {skipMAMEnrollmentCheck: true, skipJailbreakCheck: true, skipBiometricCheck: true, forceSwitch: false}});

                expect(setScreenCaptureSpy).not.toHaveBeenCalled();
                setScreenCaptureSpy.mockRestore();
            });
        });
    });
});
