// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoStateType} from '@react-native-community/netinfo';
import base64 from 'base-64';
import {isRootedExperimentalAsync} from 'expo-device';

import {License} from '@constants';
import {getDeviceToken} from '@queries/app/global';
import {getConfig, getLicense} from '@queries/servers/system';
import {advanceTimers, enableFakeTimers} from '@test/timer_helpers';

import {SessionAttributesManagerSingleton} from './index';

const mockGetClient = jest.fn();

jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {
        getClient: (...args: unknown[]) => mockGetClient(...args),
    },
}));

jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {
        serverDatabases: {
            'https://chat.example.com': {database: {}},
        },
    },
}));

jest.mock('@queries/servers/system', () => ({
    getConfig: jest.fn(),
    getLicense: jest.fn(),
}));

jest.mock('@queries/app/global', () => ({
    getDeviceToken: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
    __esModule: true,
    default: {
        fetch: jest.fn(),
        addEventListener: jest.fn(() => jest.fn()),
    },
    NetInfoStateType: {
        wifi: 'wifi',
        cellular: 'cellular',
        ethernet: 'ethernet',
        vpn: 'vpn',
        none: 'none',
        unknown: 'unknown',
    },
}));

jest.mock('expo-device', () => ({
    osVersion: '17.0',
    isRootedExperimentalAsync: jest.fn(),
}));

jest.mock('expo-application', () => ({
    nativeApplicationVersion: '2.42.0',
    nativeBuildVersion: '456',
}));

const serverUrl = 'https://chat.example.com';
const manifest: SAField[] = [
    {name: 'os_platform', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
    {name: 'os_version', type: 'string', ttl_seconds: 15, grace_period_seconds: 30},
];

const decode = (header: string) => JSON.parse(base64.decode(header)) as Record<string, string>;

describe('SessionAttributesManager', () => {
    let manager: SessionAttributesManagerSingleton;
    let mockClient: {getSessionAttributesManifest: jest.Mock};

    beforeEach(() => {
        jest.clearAllMocks();
        enableFakeTimers();
        jest.mocked(getConfig).mockResolvedValue({FeatureFlagSessionAttributes: 'true'} as ClientConfig);
        jest.mocked(getLicense).mockResolvedValue({IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced} as ClientLicense);
        jest.mocked(isRootedExperimentalAsync).mockResolvedValue(false);
        jest.mocked(getDeviceToken).mockResolvedValue('');
        jest.mocked(NetInfo.fetch).mockResolvedValue({type: NetInfoStateType.none, details: {}} as never);
        jest.mocked(NetInfo.addEventListener).mockReturnValue(jest.fn());

        mockClient = {getSessionAttributesManifest: jest.fn().mockResolvedValue(manifest)};
        mockGetClient.mockReturnValue(mockClient);

        manager = new SessionAttributesManagerSingleton();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should collect attributes lazily when building the first outbound header', async () => {
        await manager.refreshManifest(serverUrl);

        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({
            os_platform: 'ios',
            os_version: '17.0',
        });
    });

    it('should always resend ttl=0 attributes and gate ttl>0 attributes by TTL', async () => {
        await manager.refreshManifest(serverUrl);

        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({
            os_platform: 'ios',
            os_version: '17.0',
        });

        // os_platform (ttl=0) always resends; os_version (ttl=15) is still fresh
        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({
            os_platform: 'ios',
        });

        await advanceTimers(16_000);

        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({
            os_platform: 'ios',
            os_version: '17.0',
        });
    });

    it('should resend fresh attributes after the manifest is refreshed', async () => {
        await manager.refreshManifest(serverUrl);
        manager.getOutboundHeader(serverUrl);

        // os_version (ttl=15) stays fresh, so it is omitted on the next call.
        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({os_platform: 'ios'});

        // Refreshing resets lastSentAt, so os_version is resent even within its TTL.
        await manager.refreshManifest(serverUrl);
        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({
            os_platform: 'ios',
            os_version: '17.0',
        });
    });

    it('should stay dormant when the manifest is empty', async () => {
        mockClient.getSessionAttributesManifest.mockResolvedValue([]);

        await manager.refreshManifest(serverUrl);

        expect(manager.getOutboundHeader(serverUrl)).toBeUndefined();
    });

    it('should stay dormant and skip the request when the feature flag is disabled', async () => {
        jest.mocked(getConfig).mockResolvedValue({FeatureFlagSessionAttributes: 'false'} as ClientConfig);

        await manager.refreshManifest(serverUrl);

        expect(mockClient.getSessionAttributesManifest).not.toHaveBeenCalled();
        expect(manager.getOutboundHeader(serverUrl)).toBeUndefined();
    });

    it('should stay dormant and skip the request when the license is insufficient', async () => {
        jest.mocked(getLicense).mockResolvedValue({IsLicensed: 'false'} as ClientLicense);

        await manager.refreshManifest(serverUrl);

        expect(mockClient.getSessionAttributesManifest).not.toHaveBeenCalled();
        expect(manager.getOutboundHeader(serverUrl)).toBeUndefined();
    });

    it('should omit empty attribute values from the header payload', async () => {
        mockClient.getSessionAttributesManifest.mockResolvedValue([
            {name: 'os_platform', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
            {name: 'ssid', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
        ]);

        await manager.refreshManifest(serverUrl);

        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({os_platform: 'ios'});
    });

    it('should refetch the manifest when refreshManifest is called again', async () => {
        await manager.refreshManifest(serverUrl);
        mockClient.getSessionAttributesManifest.mockClear();

        await manager.refreshManifest(serverUrl);

        expect(mockClient.getSessionAttributesManifest).toHaveBeenCalled();
    });

    it('should remove server state when removeServer is called', async () => {
        await manager.refreshManifest(serverUrl);

        manager.removeServer(serverUrl);

        expect(manager.getOutboundHeader(serverUrl)).toBeUndefined();
    });

    it('should collect network attributes from the cached NetInfo state', async () => {
        mockClient.getSessionAttributesManifest.mockResolvedValue([
            {name: 'client_ip_address', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
            {name: 'network_interface_type', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
            {name: 'vpn_active', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
        ]);
        jest.mocked(NetInfo.fetch).mockResolvedValue({
            type: NetInfoStateType.wifi,
            details: {ipAddress: '10.0.0.5'},
        } as never);

        await manager.refreshManifest(serverUrl);
        await advanceTimers(0);

        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({
            client_ip_address: '10.0.0.5',
            network_interface_type: 'wifi',
            vpn_active: 'false',
        });
    });

    it('should collect the cached jailbreak status and device token', async () => {
        mockClient.getSessionAttributesManifest.mockResolvedValue([
            {name: 'jailbreak_detected', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
            {name: 'client_device_id', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
        ]);
        jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);
        jest.mocked(getDeviceToken).mockResolvedValue('device-token');

        await manager.refreshManifest(serverUrl);
        await advanceTimers(0);

        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({
            jailbreak_detected: 'true',
            client_device_id: 'device-token',
        });
    });

    it('should collect the client version and server FQDN', async () => {
        mockClient.getSessionAttributesManifest.mockResolvedValue([
            {name: 'client_version', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
            {name: 'server_fqdn', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
        ]);

        await manager.refreshManifest(serverUrl);

        expect(decode(manager.getOutboundHeader(serverUrl)!)).toEqual({
            client_version: '2.42.0+456',
            server_fqdn: 'chat.example.com',
        });
    });
});
