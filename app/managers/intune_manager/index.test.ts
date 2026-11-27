// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Unmock IntuneManager for this test file since we're testing it
jest.unmock('@managers/intune_manager');

import {Platform, type EventSubscription} from 'react-native';

import {License} from '@constants';
import DatabaseManager from '@database/manager';
import {getConfig, getLicense} from '@queries/servers/system';
import {showBiometricFailureAlertForOrganization} from '@utils/alerts';
import {isMinimumLicenseTier} from '@utils/helpers';

import IntuneManager from './index';

import type {MSALIdentity, MSALTokens, IntunePolicy} from './types';
import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
    getActiveServerUrl: jest.fn(),
}));
jest.mock('@queries/servers/system');
jest.mock('@utils/alerts');
jest.mock('@utils/helpers');
jest.mock('@mattermost/react-native-emm');
jest.mock('@managers/security_manager', () => ({
    __esModule: true,
    default: {},
}));

const mockedGetConfig = jest.mocked(getConfig);
const mockedGetLicense = jest.mocked(getLicense);
const mockedIsMinimumLicenseTier = jest.mocked(isMinimumLicenseTier);

// Get mocked Intune from the global mock
const Intune = jest.requireMock<{default: any}>('@mattermost/intune').default;

describe('IntuneManager', () => {
    const serverUrl = 'https://example.com';
    const mockDatabase = {} as unknown as Database;

    beforeEach(() => {
        jest.clearAllMocks();
        Platform.OS = 'ios';

        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
            database: mockDatabase,
            operator: {} as ServerDataOperator,
        });

        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(serverUrl);
    });

    describe('isIntuneMAMEnabledForServer', () => {
        it('should return false when database does not exist', async () => {
            jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation(() => {
                throw new Error('Database not found');
            });

            const result = await IntuneManager.isIntuneMAMEnabledForServer(serverUrl);
            expect(result).toBe(false);
        });

        it('should return false when license is below EnterpriseAdvanced tier', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'true', IntuneScope: 'scope', IntuneAuthService: 'office365'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(false);

            const result = await IntuneManager.isIntuneMAMEnabledForServer(serverUrl);
            expect(result).toBe(false);
            expect(mockedIsMinimumLicenseTier).toHaveBeenCalledWith({}, License.SKU_SHORT_NAME.EnterpriseAdvanced);
        });

        it('should return false when IntuneMAMEnabled is false', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'false', IntuneScope: 'scope', IntuneAuthService: 'office365'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(true);

            const result = await IntuneManager.isIntuneMAMEnabledForServer(serverUrl);
            expect(result).toBe(false);
        });

        it('should return false when IntuneScope is missing', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'true', IntuneAuthService: 'office365'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(true);

            const result = await IntuneManager.isIntuneMAMEnabledForServer(serverUrl);
            expect(result).toBe(false);
        });

        it('should return false when IntuneAuthService is missing', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'true', IntuneScope: 'scope'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(true);

            const result = await IntuneManager.isIntuneMAMEnabledForServer(serverUrl);
            expect(result).toBe(false);
        });

        it('should return true when all conditions are met', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'true', IntuneScope: 'scope', IntuneAuthService: 'office365'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(true);

            const result = await IntuneManager.isIntuneMAMEnabledForServer(serverUrl);
            expect(result).toBe(true);
        });
    });

    describe('login', () => {
        const scopes = ['User.Read', 'custom.scope'];
        const mockTokens: MSALTokens = {
            idToken: 'id_token',
            accessToken: 'access_token',
            identity: {upn: 'user@example.com', tid: 'tenant_id', oid: 'object_id'},
        };

        it('should return tokens on successful login', async () => {
            jest.mocked(Intune.login).mockResolvedValue(mockTokens);

            const result = await IntuneManager.login(serverUrl, scopes);
            expect(result).toEqual(mockTokens);
            expect(jest.mocked(Intune.login)).toHaveBeenCalledWith(serverUrl, scopes);
        });

        it('should throw error on login failure', async () => {
            const error = new Error('Login failed');
            jest.mocked(Intune.login).mockRejectedValue(error);

            await expect(IntuneManager.login(serverUrl, scopes)).rejects.toThrow('Login failed');
        });
    });

    describe('enrollServer', () => {
        const mockIdentity: MSALIdentity = {
            upn: 'user@example.com',
            tid: 'tenant_id',
            oid: 'object_id',
        };

        it('should call enrollInMAM on successful enrollment', () => {
            jest.mocked(Intune.enrollInMAM).mockReturnValue();

            IntuneManager.enrollServer(serverUrl, mockIdentity);
            expect(jest.mocked(Intune.enrollInMAM)).toHaveBeenCalledWith(serverUrl, mockIdentity);
        });
    });

    describe('enrollAndWait', () => {
        const mockIdentity: MSALIdentity = {
            upn: 'user@example.com',
            tid: 'tenant_id',
            oid: 'object_id',
        };
        const mockPolicy = {} as IntunePolicy;
        let emit: (event: {enrolled: boolean; oid: string; serverUrls: string[]; reason?: string}) => void;
        let remove: jest.Mock;

        beforeEach(() => {
            remove = jest.fn();
            jest.mocked(Intune.enrollInMAM).mockReset();
            jest.mocked(Intune.getPolicy).mockReset();
            jest.mocked(Intune.onIntuneEnrollmentChanged).mockImplementation((handler: typeof emit) => {
                emit = handler;
                return {remove};
            });
        });

        afterEach(() => {
            jest.mocked(Intune.getPolicy).mockReset().mockResolvedValue(null);
            jest.mocked(Intune.onIntuneEnrollmentChanged).mockReset().mockImplementation(() => ({remove: jest.fn()}));
        });

        it('subscribes before enrolling', async () => {
            const calls: string[] = [];
            jest.mocked(Intune.onIntuneEnrollmentChanged).mockImplementation((handler: typeof emit) => {
                calls.push('subscribe');
                emit = handler;
                return {remove};
            });
            jest.mocked(Intune.enrollInMAM).mockImplementation(() => calls.push('enroll'));

            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity);

            expect(calls).toEqual(['subscribe', 'enroll']);

            emit({enrolled: false, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'failed'});
            await promise;
        });

        it('resolves enrolled when enrollment succeeds with a policy', async () => {
            jest.mocked(Intune.getPolicy).mockReturnValue(mockPolicy);

            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity);
            emit({enrolled: true, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'success'});

            await expect(promise).resolves.toBe('enrolled');
            expect(remove).toHaveBeenCalled();
        });

        it('resolves not_protected when enrollment succeeds without a policy', async () => {
            jest.mocked(Intune.getPolicy).mockReturnValue(null);

            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity);
            emit({enrolled: true, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'success'});

            await expect(promise).resolves.toBe('not_protected');
        });

        it('resolves failed when the policy cannot be read after enrollment', async () => {
            jest.mocked(Intune.getPolicy).mockImplementation(() => {
                throw new Error('policy read failed');
            });

            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity);
            emit({enrolled: true, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'success'});

            await expect(promise).resolves.toBe('failed');
            expect(remove).toHaveBeenCalled();
        });

        it('resolves not_licensed when the account is not licensed', async () => {
            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity);
            emit({enrolled: false, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'not_licensed'});

            await expect(promise).resolves.toBe('not_licensed');
        });

        it.each(['not_targeted', 'licensed_not_targeted'])('resolves not_protected when the account is %s', async (reason) => {
            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity);
            emit({enrolled: false, oid: mockIdentity.oid, serverUrls: [serverUrl], reason});

            await expect(promise).resolves.toBe('not_protected');
        });

        it('resolves failed when enrollment fails', async () => {
            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity);
            emit({enrolled: false, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'failed'});

            await expect(promise).resolves.toBe('failed');
        });

        it('matches the event by oid when the server urls are empty', async () => {
            jest.mocked(Intune.getPolicy).mockReturnValue(mockPolicy);

            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity);
            emit({enrolled: true, oid: mockIdentity.oid, serverUrls: [], reason: 'success'});

            await expect(promise).resolves.toBe('enrolled');
        });

        it('ignores events for another account and unenroll events', async () => {
            jest.mocked(Intune.getPolicy).mockReturnValue(mockPolicy);

            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity);
            emit({enrolled: false, oid: 'other_oid', serverUrls: ['https://other.example.com'], reason: 'not_licensed'});
            emit({enrolled: false, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'unenrolled'});
            emit({enrolled: true, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'success'});

            await expect(promise).resolves.toBe('enrolled');
        });

        it('resolves timeout when no outcome arrives', async () => {
            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity, 20);

            await expect(promise).resolves.toBe('timeout');
            expect(remove).toHaveBeenCalled();
        });

        it('resolves only once', async () => {
            jest.mocked(Intune.getPolicy).mockReturnValue(mockPolicy);

            const promise = IntuneManager.enrollAndWait(serverUrl, mockIdentity, 5000);
            emit({enrolled: true, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'success'});
            emit({enrolled: false, oid: mockIdentity.oid, serverUrls: [serverUrl], reason: 'not_licensed'});

            await expect(promise).resolves.toBe('enrolled');
            expect(remove).toHaveBeenCalledTimes(1);
        });
    });

    describe('unenrollServer', () => {
        it('should still deregister a registered account that has no policy', async () => {
            jest.mocked(Intune.isManagedServer).mockReturnValue(false);
            jest.mocked(Intune.deregisterAndUnenroll).mockResolvedValue();

            await IntuneManager.unenrollServer(serverUrl, false);
            expect(jest.mocked(Intune.deregisterAndUnenroll)).toHaveBeenCalledWith(serverUrl, false);
        });

        it('should clear current identity when unenrolling active server', async () => {
            jest.mocked(Intune.setCurrentIdentity).mockResolvedValue();
            jest.mocked(Intune.deregisterAndUnenroll).mockResolvedValue();

            await IntuneManager.unenrollServer(serverUrl, false);
            expect(jest.mocked(Intune.setCurrentIdentity)).toHaveBeenCalledWith(null);
            expect(jest.mocked(Intune.deregisterAndUnenroll)).toHaveBeenCalledWith(serverUrl, false);
        });

        it('should not clear identity when unenrolling non-active server', async () => {
            jest.mocked(Intune.isManagedServer).mockReturnValue(true);
            jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('https://other.com');
            jest.mocked(Intune.deregisterAndUnenroll).mockResolvedValue();

            await IntuneManager.unenrollServer(serverUrl, false);
            expect(jest.mocked(Intune.setCurrentIdentity)).not.toHaveBeenCalled();
            expect(jest.mocked(Intune.deregisterAndUnenroll)).toHaveBeenCalledWith(serverUrl, false);
        });

        it('should call deregisterAndUnenroll with doWipe = true', async () => {
            jest.mocked(Intune.isManagedServer).mockReturnValue(true);
            jest.mocked(Intune.deregisterAndUnenroll).mockResolvedValue();

            await IntuneManager.unenrollServer(serverUrl, true);
            expect(jest.mocked(Intune.deregisterAndUnenroll)).toHaveBeenCalledWith(serverUrl, true);
        });

        it('should catch and log errors on unenrollment failure', async () => {
            jest.mocked(Intune.isManagedServer).mockReturnValue(true);
            jest.mocked(Intune.deregisterAndUnenroll).mockRejectedValue(new Error('Unenroll failed'));

            await IntuneManager.unenrollServer(serverUrl, false);
        });
    });

    describe('isManagedServer', () => {
        it('should return true when server is managed', () => {
            jest.mocked(Intune.isManagedServer).mockReturnValue(true);

            const result = IntuneManager.isManagedServer(serverUrl);
            expect(result).toBe(true);
            expect(jest.mocked(Intune.isManagedServer)).toHaveBeenCalledWith(serverUrl);
        });

        it('should return false when server is not managed', () => {
            jest.mocked(Intune.isManagedServer).mockReturnValue(false);

            const result = IntuneManager.isManagedServer(serverUrl);
            expect(result).toBe(false);
        });
    });

    describe('getOid', () => {
        it('should return the enrolled oid for the server', () => {
            jest.mocked(Intune.getOid).mockReturnValue('object-id');

            expect(IntuneManager.getOid(serverUrl)).toBe('object-id');
            expect(jest.mocked(Intune.getOid)).toHaveBeenCalledWith(serverUrl);
        });

        it('should return null when the server has no enrollment', () => {
            jest.mocked(Intune.getOid).mockReturnValue(null);

            expect(IntuneManager.getOid(serverUrl)).toBeNull();
        });
    });

    describe('setCurrentIdentity', () => {
        it('should set null identity', async () => {
            jest.mocked(Intune.setCurrentIdentity).mockResolvedValue();

            await IntuneManager.setCurrentIdentity(null);
            expect(jest.mocked(Intune.setCurrentIdentity)).toHaveBeenCalledWith(null);
        });

        it('should set identity when server is licensed', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'true', IntuneScope: 'scope', IntuneAuthService: 'office365'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(true);
            jest.mocked(Intune.setCurrentIdentity).mockResolvedValue();

            await IntuneManager.setCurrentIdentity(serverUrl);
            expect(jest.mocked(Intune.setCurrentIdentity)).toHaveBeenCalledWith(serverUrl);
        });

        it.each([
            [false, 0],
            [true, 1],
        ])('should show the biometric failure alert only for a managed server (managed: %s)', async (managed, calls) => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'true', IntuneScope: 'scope', IntuneAuthService: 'office365'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(true);
            jest.mocked(Intune.isManagedServer).mockReturnValue(managed);
            jest.mocked(Intune.setCurrentIdentity).mockRejectedValue(new Error('blocked'));
            jest.mocked(showBiometricFailureAlertForOrganization).mockClear();

            await IntuneManager.setCurrentIdentity(serverUrl);
            expect(jest.mocked(showBiometricFailureAlertForOrganization)).toHaveBeenCalledTimes(calls);
        });

        it('should clear identity when server is not licensed', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'false'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(false);
            jest.mocked(Intune.setCurrentIdentity).mockResolvedValue();

            await IntuneManager.setCurrentIdentity(serverUrl);
            expect(jest.mocked(Intune.setCurrentIdentity)).toHaveBeenCalledWith(null);
        });
    });

    describe('getPolicy', () => {
        const mockPolicy: IntunePolicy = {
            isPINRequired: true,
            isContactSyncAllowed: false,
            isWidgetContentSyncAllowed: false,
            isSpotlightIndexingAllowed: false,
            areSiriIntentsAllowed: false,
            areAppIntentsAllowed: false,
            isAppSharingAllowed: false,
            isManagedBrowserRequired: false,
            isFileEncryptionRequired: false,
            isScreenCaptureAllowed: false,
            shouldFileProviderEncryptFiles: false,
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

        it('should return null when Intune not enabled for server', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'false'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(false);

            const result = await IntuneManager.getPolicy(serverUrl);
            expect(result).toBeNull();
        });

        it('should return null when server not managed', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'true', IntuneScope: 'scope', IntuneAuthService: 'office365'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(true);
            jest.mocked(Intune.isManagedServer).mockResolvedValue(false);

            const result = await IntuneManager.getPolicy(serverUrl);
            expect(result).toBeNull();
        });

        it('should return policy when server is managed', async () => {
            mockedGetConfig.mockResolvedValue({IntuneMAMEnabled: 'true', IntuneScope: 'scope', IntuneAuthService: 'saml'} as ClientConfig);
            mockedGetLicense.mockResolvedValue({} as ClientLicense);
            mockedIsMinimumLicenseTier.mockReturnValue(true);
            jest.mocked(Intune.isManagedServer).mockReturnValue(true);
            jest.mocked(Intune.getPolicy).mockResolvedValue(mockPolicy);

            const result = await IntuneManager.getPolicy(serverUrl);
            expect(result).toEqual(mockPolicy);
            expect(jest.mocked(Intune.getPolicy)).toHaveBeenCalledWith(serverUrl);
        });
    });

    describe('Event Subscription Methods', () => {
        const mockHandler = jest.fn();
        const mockSubscription = {remove: jest.fn()} as unknown as EventSubscription;

        beforeEach(() => {
            jest.mocked(Intune.onIntunePolicyChanged).mockReturnValue(mockSubscription);
            jest.mocked(Intune.onIntuneEnrollmentChanged).mockReturnValue(mockSubscription);
            jest.mocked(Intune.onIntuneWipeRequested).mockReturnValue(mockSubscription);
            jest.mocked(Intune.onIntuneAuthRequired).mockReturnValue(mockSubscription);
            jest.mocked(Intune.onIntuneConditionalLaunchBlocked).mockReturnValue(mockSubscription);
            jest.mocked(Intune.onIntuneIdentitySwitchRequired).mockReturnValue(mockSubscription);
        });

        describe('subscribeToPolicyChanges', () => {
            it('should return EventSubscription when Intune library available', () => {
                const result = IntuneManager.subscribeToPolicyChanges(mockHandler);
                expect(result).toBe(mockSubscription);
                expect(jest.mocked(Intune.onIntunePolicyChanged)).toHaveBeenCalledWith(mockHandler);
            });
        });

        describe('subscribeToEnrollmentChanges', () => {
            it('should return EventSubscription when Intune library available', () => {
                const result = IntuneManager.subscribeToEnrollmentChanges(mockHandler);
                expect(result).toBe(mockSubscription);
                expect(jest.mocked(Intune.onIntuneEnrollmentChanged)).toHaveBeenCalledWith(mockHandler);
            });
        });

        describe('subscribeToWipeRequests', () => {
            it('should return EventSubscription when Intune library available', () => {
                const result = IntuneManager.subscribeToWipeRequests(mockHandler);
                expect(result).toBe(mockSubscription);
                expect(jest.mocked(Intune.onIntuneWipeRequested)).toHaveBeenCalledWith(mockHandler);
            });
        });

        describe('subscribeToAuthRequired', () => {
            it('should return EventSubscription when Intune library available', () => {
                const result = IntuneManager.subscribeToAuthRequired(mockHandler);
                expect(result).toBe(mockSubscription);
                expect(jest.mocked(Intune.onIntuneAuthRequired)).toHaveBeenCalledWith(mockHandler);
            });
        });

        describe('subscribeToConditionalLaunchBlocked', () => {
            it('should return EventSubscription when Intune library available', () => {
                const result = IntuneManager.subscribeToConditionalLaunchBlocked(mockHandler);
                expect(result).toBe(mockSubscription);
                expect(jest.mocked(Intune.onIntuneConditionalLaunchBlocked)).toHaveBeenCalledWith(mockHandler);
            });
        });

        describe('subscribeToIdentitySwitchRequired', () => {
            it('should return EventSubscription when Intune library available', () => {
                const result = IntuneManager.subscribeToIdentitySwitchRequired(mockHandler);
                expect(result).toBe(mockSubscription);
                expect(jest.mocked(Intune.onIntuneIdentitySwitchRequired)).toHaveBeenCalledWith(mockHandler);
            });
        });
    });
});
