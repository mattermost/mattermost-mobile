// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, Platform} from 'react-native';
import Permissions from 'react-native-permissions';

import {getIntlShape} from '@utils/general';

import {hasMicrophonePermission, requestMicrophonePermission} from '.';

jest.mock('react-native-permissions', () => ({
    PERMISSIONS: {
        IOS: {
            MICROPHONE: 'ios.microphone',
        },
        ANDROID: {
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
    openSettings: jest.fn(),
}));

describe('microphone permission', () => {
    const intl = getIntlShape();

    beforeEach(() => {
        jest.clearAllMocks();
        Platform.select = jest.fn((options) => options.ios);
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
            expect(Permissions.request).toHaveBeenCalledWith(Permissions.PERMISSIONS.IOS.MICROPHONE);
        });

        it('should return false when the request is rejected', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.DENIED);
            jest.mocked(Permissions.request).mockResolvedValue(Permissions.RESULTS.DENIED);
            const result = await hasMicrophonePermission();
            expect(result).toBe(false);
        });

        it('should return false when blocked', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.BLOCKED);
            const result = await hasMicrophonePermission();
            expect(result).toBe(false);
            expect(Permissions.request).not.toHaveBeenCalled();
        });

        it('should check the Android permission on Android', async () => {
            Platform.select = jest.fn((options: Record<string, unknown>) => options.default);
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.GRANTED);
            await hasMicrophonePermission();
            expect(Permissions.check).toHaveBeenCalledWith(Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO);
        });
    });

    describe('requestMicrophonePermission', () => {
        it('should return true without alerting when permission is granted', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.GRANTED);
            const alertSpy = jest.spyOn(Alert, 'alert');

            const result = await requestMicrophonePermission(intl);

            expect(result).toBe(true);
            expect(alertSpy).not.toHaveBeenCalled();
        });

        it('should return false without alerting when the user rejects the request', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.DENIED);
            jest.mocked(Permissions.request).mockResolvedValue(Permissions.RESULTS.DENIED);
            const alertSpy = jest.spyOn(Alert, 'alert');

            const result = await requestMicrophonePermission(intl);

            expect(result).toBe(false);
            expect(alertSpy).not.toHaveBeenCalled();
        });

        it('should alert with a settings action when blocked', async () => {
            jest.mocked(Permissions.check).mockResolvedValue(Permissions.RESULTS.BLOCKED);
            const alertSpy = jest.spyOn(Alert, 'alert');

            const result = await requestMicrophonePermission(intl);

            expect(result).toBe(false);
            expect(alertSpy).toHaveBeenCalledTimes(1);

            const buttons = alertSpy.mock.calls[0][2]!;
            expect(buttons).toHaveLength(2);
            buttons[0].onPress?.();
            expect(Permissions.openSettings).toHaveBeenCalledTimes(1);
        });
    });
});
