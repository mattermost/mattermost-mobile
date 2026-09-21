// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getAndroidId, getIosIdForVendorAsync} from 'expo-application';
import {isRootedExperimentalAsync} from 'expo-device';
import {Platform} from 'react-native';
import {PERMISSIONS, RESULTS, check, request} from 'react-native-permissions';

import {License} from '@constants';
import DatabaseManager from '@database/manager';
import {getConfigBooleanValue, getLicense} from '@queries/servers/system';

const mockSetSessionAttributesEnabled = jest.fn();
const mockRemoveSessionAttributesServer = jest.fn();
const mockSetSessionAttributesManifest = jest.fn();
const mockUpsertSessionAttributesField = jest.fn();
const mockRemoveSessionAttributesField = jest.fn();
const mockSetSessionAttributesStableValues = jest.fn();
const mockFetchSessionAttributesManifest = jest.fn();

jest.mock('expo-application', () => ({
    getAndroidId: jest.fn(() => 'android-device-id'),
    getIosIdForVendorAsync: jest.fn().mockResolvedValue('ios-device-id'),
    nativeApplicationVersion: '2.20.0',
    nativeBuildVersion: '456',
}));

jest.mock('expo-device', () => ({
    isRootedExperimentalAsync: jest.fn().mockResolvedValue(false),
    osVersion: '18.0',
}));

jest.mock('@actions/remote/session_attributes', () => ({
    fetchSessionAttributesManifest: (...args: unknown[]) => mockFetchSessionAttributesManifest(...args),
}));
jest.mock('@database/manager');
jest.mock('@mattermost/react-native-network-client', () => ({
    setSessionAttributesEnabled: (...args: unknown[]) => mockSetSessionAttributesEnabled(...args),
    removeSessionAttributesServer: (...args: unknown[]) => mockRemoveSessionAttributesServer(...args),
    setSessionAttributesManifest: (...args: unknown[]) => mockSetSessionAttributesManifest(...args),
    upsertSessionAttributesField: (...args: unknown[]) => mockUpsertSessionAttributesField(...args),
    removeSessionAttributesField: (...args: unknown[]) => mockRemoveSessionAttributesField(...args),
    setSessionAttributesStableValues: (...args: unknown[]) => mockSetSessionAttributesStableValues(...args),
}));
jest.mock('@queries/servers/system');
jest.mock('@utils/log');

import {SessionAttributesManagerSingleton} from './index';

const serverUrl = 'https://chat.example.com';
const manifest: SAField[] = [
    {name: 'os_platform', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
];
const ssidManifest: SAField[] = [
    {name: 'ssid', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
];

const iosStableValues = {
    jailbreak_detected: 'false',
    os_version: '18.0',
    os_platform: 'ios',
    client_version: '2.20.0+456',
    client_device_id: 'ios-device-id',
};

describe('SessionAttributesManager', () => {
    let manager: SessionAttributesManagerSingleton;
    const mockDatabase = {};

    beforeEach(() => {
        jest.clearAllMocks();
        Platform.OS = 'ios';
        manager = new SessionAttributesManagerSingleton();
        (DatabaseManager.serverDatabases as Record<string, unknown>)[serverUrl] = {database: mockDatabase};
        jest.mocked(getConfigBooleanValue).mockResolvedValue(true);
        jest.mocked(getLicense).mockResolvedValue({
            IsLicensed: 'true',
            SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced,
        } as ClientLicense);
        mockFetchSessionAttributesManifest.mockResolvedValue({manifest});
        jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);
        jest.mocked(check).mockResolvedValue(RESULTS.GRANTED);
        jest.mocked(request).mockResolvedValue(RESULTS.GRANTED);
    });

    it('should collect stable values from Expo on iOS', async () => {
        await manager.syncStaticValues();

        expect(mockSetSessionAttributesStableValues).toHaveBeenCalledWith(iosStableValues);
        expect(getIosIdForVendorAsync).toHaveBeenCalled();
    });

    it('should collect stable values from Expo on Android', async () => {
        Platform.OS = 'android';
        jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);

        await manager.syncStaticValues();

        expect(mockSetSessionAttributesStableValues).toHaveBeenCalledWith({
            jailbreak_detected: 'true',
            os_version: '18.0',
            os_platform: 'android',
            client_version: '2.20.0+456',
            client_device_id: 'android-device-id',
        });
        expect(getAndroidId).toHaveBeenCalled();
    });

    it('should push stable values before pushing the manifest to native', async () => {
        await manager.refreshManifest(serverUrl);

        const stableValuesOrder = mockSetSessionAttributesStableValues.mock.invocationCallOrder[0];
        const manifestOrder = mockSetSessionAttributesManifest.mock.invocationCallOrder[0];
        expect(stableValuesOrder).toBeLessThan(manifestOrder);
    });

    it('should enable native collection and push the manifest when refreshManifest succeeds', async () => {
        await manager.refreshManifest(serverUrl);

        expect(mockSetSessionAttributesEnabled).toHaveBeenCalledWith(serverUrl, true);
        expect(mockSetSessionAttributesManifest).toHaveBeenCalledWith(serverUrl, manifest);
    });

    it('should remove the server when the feature flag is disabled', async () => {
        jest.mocked(getConfigBooleanValue).mockResolvedValue(false);

        await manager.refreshManifest(serverUrl);

        expect(mockRemoveSessionAttributesServer).toHaveBeenCalledWith(serverUrl);
        expect(mockSetSessionAttributesManifest).not.toHaveBeenCalled();
    });

    it('should remove the server when the license tier is too low', async () => {
        jest.mocked(getLicense).mockResolvedValue({SkuShortName: License.SKU_SHORT_NAME.Professional} as ClientLicense);

        await manager.refreshManifest(serverUrl);

        expect(mockRemoveSessionAttributesServer).toHaveBeenCalledWith(serverUrl);
    });

    it('should clear the manifest when the server returns an empty manifest', async () => {
        mockFetchSessionAttributesManifest.mockResolvedValue({manifest: []});

        await manager.refreshManifest(serverUrl);

        expect(mockSetSessionAttributesManifest).toHaveBeenCalledWith(serverUrl, []);
    });

    it('should leave native state untouched when the manifest fetch fails', async () => {
        mockFetchSessionAttributesManifest.mockResolvedValue({error: new Error('network error')});

        await manager.refreshManifest(serverUrl);

        expect(mockSetSessionAttributesManifest).not.toHaveBeenCalled();
        expect(mockRemoveSessionAttributesServer).not.toHaveBeenCalled();
    });

    it('should remove the server when the database is missing', async () => {
        delete (DatabaseManager.serverDatabases as Record<string, unknown>)[serverUrl];

        await manager.refreshManifest(serverUrl);

        expect(mockRemoveSessionAttributesServer).toHaveBeenCalledWith(serverUrl);
    });

    it('should remove the server when refreshManifest throws', async () => {
        mockFetchSessionAttributesManifest.mockRejectedValue(new Error('network error'));

        await manager.refreshManifest(serverUrl);

        expect(mockRemoveSessionAttributesServer).toHaveBeenCalledWith(serverUrl);
    });

    it('should forward removeServer to native', () => {
        manager.removeServer(serverUrl);
        expect(mockRemoveSessionAttributesServer).toHaveBeenCalledWith(serverUrl);
    });

    it('should forward upsertManifestField to native', () => {
        const field: SAField = {name: 'os_version', type: 'string', ttl_seconds: 60, grace_period_seconds: 0};
        manager.upsertManifestField(serverUrl, field);
        expect(mockUpsertSessionAttributesField).toHaveBeenCalledWith(serverUrl, field);
    });

    it('should forward removeManifestField to native', () => {
        manager.removeManifestField(serverUrl, 'os_version');
        expect(mockRemoveSessionAttributesField).toHaveBeenCalledWith(serverUrl, 'os_version');
    });

    describe('location permission for the ssid attribute', () => {
        it('should request location when the manifest includes ssid and it has not been asked yet', async () => {
            mockFetchSessionAttributesManifest.mockResolvedValue({manifest: ssidManifest});
            jest.mocked(check).mockResolvedValue(RESULTS.DENIED);

            await manager.refreshManifest(serverUrl);
            await new Promise(process.nextTick);

            expect(request).toHaveBeenCalledWith(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        });

        it('should not request location when the manifest omits ssid', async () => {
            jest.mocked(check).mockResolvedValue(RESULTS.DENIED);

            await manager.refreshManifest(serverUrl);
            await new Promise(process.nextTick);

            expect(check).not.toHaveBeenCalled();
            expect(request).not.toHaveBeenCalled();
        });

        it('should not request location when it has already been granted', async () => {
            mockFetchSessionAttributesManifest.mockResolvedValue({manifest: ssidManifest});

            await manager.refreshManifest(serverUrl);
            await new Promise(process.nextTick);

            expect(request).not.toHaveBeenCalled();
        });

        it('should not request location when the permission is blocked', async () => {
            mockFetchSessionAttributesManifest.mockResolvedValue({manifest: ssidManifest});
            jest.mocked(check).mockResolvedValue(RESULTS.BLOCKED);

            await manager.refreshManifest(serverUrl);
            await new Promise(process.nextTick);

            expect(request).not.toHaveBeenCalled();
        });

        it('should request location when the ssid field arrives over the websocket', async () => {
            jest.mocked(check).mockResolvedValue(RESULTS.DENIED);

            manager.upsertManifestField(serverUrl, ssidManifest[0]);
            await new Promise(process.nextTick);

            expect(request).toHaveBeenCalledWith(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        });

        it('should not request location for a field other than ssid', async () => {
            jest.mocked(check).mockResolvedValue(RESULTS.DENIED);

            manager.upsertManifestField(serverUrl, manifest[0]);
            await new Promise(process.nextTick);

            expect(check).not.toHaveBeenCalled();
        });
    });
});
