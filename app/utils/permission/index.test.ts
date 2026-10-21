// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert, Platform} from 'react-native';
import Permissions from 'react-native-permissions';

import {getIntlShape} from '@utils/general';

import {hasMicrophonePermission, requestMicrophonePermission} from '.';

describe('microphone permission', () => {
    const intl = getIntlShape();

    describe('hasMicrophonePermission', () => {
        it('should return true when permission is granted', async () => {
            jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.GRANTED);
            const result = await hasMicrophonePermission();
            expect(result).toBe(true);
            expect(Permissions.check).toHaveBeenCalledWith(Permissions.PERMISSIONS.IOS.MICROPHONE);
        });

        it('should request permission when denied', async () => {
            jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.DENIED);
            jest.mocked(Permissions.request).mockResolvedValueOnce(Permissions.RESULTS.GRANTED);
            const result = await hasMicrophonePermission();
            expect(result).toBe(true);
            expect(Permissions.request).toHaveBeenCalledWith(Permissions.PERMISSIONS.IOS.MICROPHONE);
        });

        it('should return false when the request is rejected', async () => {
            jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.DENIED);
            jest.mocked(Permissions.request).mockResolvedValueOnce(Permissions.RESULTS.DENIED);
            const result = await hasMicrophonePermission();
            expect(result).toBe(false);
        });

        it('should return false when blocked', async () => {
            jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.BLOCKED);
            const result = await hasMicrophonePermission();
            expect(result).toBe(false);
            expect(Permissions.request).not.toHaveBeenCalled();
        });

        it('should check the Android permission on Android', async () => {
            const select = jest.spyOn(Platform, 'select').mockImplementation(((spec: Record<string, unknown>) => spec.android ?? spec.default) as typeof Platform.select);

            try {
                await hasMicrophonePermission();
            } finally {
                select.mockRestore();
            }

            expect(Permissions.check).toHaveBeenCalledWith(Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO);
        });
    });

    describe('requestMicrophonePermission', () => {
        it('should return true without alerting when permission is granted', async () => {
            jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.GRANTED);
            const alertSpy = jest.spyOn(Alert, 'alert');

            const result = await requestMicrophonePermission(intl);

            expect(result).toBe(true);
            expect(alertSpy).not.toHaveBeenCalled();
        });

        it('should return false without alerting when the user rejects the request', async () => {
            jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.DENIED);
            jest.mocked(Permissions.request).mockResolvedValueOnce(Permissions.RESULTS.DENIED);
            const alertSpy = jest.spyOn(Alert, 'alert');

            const result = await requestMicrophonePermission(intl);

            expect(result).toBe(false);
            expect(alertSpy).not.toHaveBeenCalled();
        });

        it('should alert with a settings action when blocked', async () => {
            jest.mocked(Permissions.check).mockResolvedValueOnce(Permissions.RESULTS.BLOCKED);
            const alertSpy = jest.spyOn(Alert, 'alert');

            const result = await requestMicrophonePermission(intl);

            expect(result).toBe(false);
            expect(Permissions.check).toHaveBeenCalledTimes(1);
            expect(Permissions.request).not.toHaveBeenCalled();
            expect(alertSpy).toHaveBeenCalledTimes(1);

            const buttons = alertSpy.mock.calls[0][2];
            expect(buttons).toHaveLength(2);
            buttons?.[0].onPress?.();
            expect(Permissions.openSettings).toHaveBeenCalledTimes(1);
        });
    });
});
