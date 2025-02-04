// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import Permissions from 'react-native-permissions';

import {hasBluetoothPermission, hasMicrophonePermission} from './permissions';

jest.mock('react-native-permissions', () => ({
    PERMISSIONS: {
        IOS: {
            BLUETOOTH: 'ios.bluetooth',
            MICROPHONE: 'ios.microphone',
        },
        ANDROID: {
            BLUETOOTH_CONNECT: 'android.bluetooth_connect',
            RECORD_AUDIO: 'android.record_audio',
        },
    },
    RESULTS: {
        DENIED: 'denied',
        GRANTED: 'granted',
        BLOCKED: 'blocked',
        UNAVAILABLE: 'unavailable',
    },
    check: jest.fn(),
    request: jest.fn(),
}));

describe('Permissions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Platform.select = jest.fn((options) => options.ios);
    });

    describe('hasBluetoothPermission', () => {
        it('should return true when permission is granted', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.GRANTED);
            const result = await hasBluetoothPermission();
            expect(result).toBe(true);
        });

        it('should request permission when denied', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.DENIED);
            jest.mocked(Permissions.request).mockResolvedValue(Permissions.RESULTS.GRANTED);
            const result = await hasBluetoothPermission();
            expect(result).toBe(true);
            expect(Permissions.request).toHaveBeenCalled();
        });

        it('should return false when blocked', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.BLOCKED);
            const result = await hasBluetoothPermission();
            expect(result).toBe(false);
        });

        it('should handle Android permissions', async () => {
            Platform.select = jest.fn((options: Record<string, unknown>) => options.default);
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.GRANTED);
            await hasBluetoothPermission();
            expect(Permissions.check).toHaveBeenCalledWith(Permissions.PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
        });
    });

    describe('hasMicrophonePermission', () => {
        it('should return true when permission is granted', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.GRANTED);
            const result = await hasMicrophonePermission();
            expect(result).toBe(true);
        });

        it('should request permission when denied', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.DENIED);
            jest.mocked(Permissions.request).mockResolvedValue(Permissions.RESULTS.GRANTED);
            const result = await hasMicrophonePermission();
            expect(result).toBe(true);
            expect(Permissions.request).toHaveBeenCalled();
        });

        it('should return false when blocked', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.BLOCKED);
            const result = await hasMicrophonePermission();
            expect(result).toBe(false);
        });

        it('should handle Android permissions', async () => {
            Platform.select = jest.fn((options: Record<string, unknown>) => options.default);
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.GRANTED);
            await hasMicrophonePermission();
            expect(Permissions.check).toHaveBeenCalledWith(Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO);
        });
    });
});
