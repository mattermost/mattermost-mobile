// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {NetInfoStateType} from '@react-native-community/netinfo';
import {isRootedExperimentalAsync} from 'expo-device';

import {getDeviceToken} from '@queries/app/global';

import sessionAttributeCollector, {SessionAttributeCollector} from './index';

jest.mock('@react-native-community/netinfo', () => ({
    __esModule: true,
    default: {
        fetch: jest.fn(),
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
    osVersion: '17.4',
    isRootedExperimentalAsync: jest.fn(),
}));

jest.mock('expo-application', () => ({
    nativeApplicationVersion: '2.41.0',
    nativeBuildVersion: '456',
}));

jest.mock('@queries/app/global', () => ({
    getDeviceToken: jest.fn(),
}));

describe('SessionAttributeCollector', () => {
    const collector = new SessionAttributeCollector();
    const serverUrl = 'https://chat.example.com';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should export a collector singleton', () => {
        expect(sessionAttributeCollector).toBeInstanceOf(SessionAttributeCollector);
    });

    it('should collect os and client metadata', async () => {
        expect(collector.getOSVersion()).toBe('17.4');
        expect(collector.getServerFQDN(serverUrl)).toBe('chat.example.com');
        await expect(collector.getJailbreakDetected()).resolves.toBe('false');
        expect(collector.getOSPlatform()).toBe('ios');

        jest.mocked(isRootedExperimentalAsync).mockResolvedValue(true);
        await expect(collector.getJailbreakDetected()).resolves.toBe('true');

        jest.mocked(getDeviceToken).mockResolvedValue('device-token');
        await expect(collector.getClientDeviceId()).resolves.toBe('device-token');

        expect(collector.getClientVersion()).toBe('2.41.0+456');
    });

    it('should map NetInfo state to network attributes', async () => {
        jest.mocked(NetInfo.fetch).mockResolvedValue({
            type: NetInfoStateType.wifi,
            isConnected: true,
            isInternetReachable: true,
            details: {
                ipAddress: '10.0.0.5',
                isConnectionExpensive: false,
            },
        } as never);

        await expect(collector.getNetworkInterfaceType()).resolves.toBe('wifi');
        await expect(collector.getClientIPAddress()).resolves.toBe('10.0.0.5');
    });

    it('should return empty string for native-backed attributes until rnutils bridge lands', async () => {
        await expect(collector.getSSID()).resolves.toBe('');
        await expect(collector.getMDMEnrolled()).resolves.toBe('');
    });
});
