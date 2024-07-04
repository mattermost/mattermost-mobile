// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {
    storePushDisabledInServerAcknowledged,
} from '@actions/app/global';
import {
    PUSH_PROXY_RESPONSE_NOT_AVAILABLE,
    PUSH_PROXY_RESPONSE_UNKNOWN,
    PUSH_PROXY_STATUS_NOT_AVAILABLE,
    PUSH_PROXY_STATUS_UNKNOWN,
    PUSH_PROXY_STATUS_VERIFIED,
} from '@constants/push_proxy';
import EphemeralStore from '@store/ephemeral_store';

import {
    pushDisabledInServerAck,
    canReceiveNotifications,
    alertPushProxyError,
    alertPushProxyUnknown,
} from './push_proxy';
import {urlSafeBase64Encode} from './security';

import type {IntlShape} from 'react-intl';

jest.mock('react-native', () => ({
    Alert: {
        alert: jest.fn(),
    },
}));

jest.mock('@actions/app/global', () => ({
    storePushDisabledInServerAcknowledged: jest.fn(),
}));

jest.mock('@queries/app/global', () => ({
    getPushDisabledInServerAcknowledged: jest.fn(),
}));

jest.mock('@store/ephemeral_store', () => ({
    setPushProxyVerificationState: jest.fn(),
}));

jest.mock('./security', () => ({
    urlSafeBase64Encode: jest.fn((url: string) => `encoded-${url}`),
}));

// Mock pushDisabledInServerAck as it's not being mocked by default
jest.mock('./push_proxy', () => ({
    ...jest.requireActual('./push_proxy'),
    pushDisabledInServerAck: jest.fn(),
}));

describe('Notification utilities', () => {
    const intl: IntlShape = {
        formatMessage: ({defaultMessage}: { defaultMessage: string }) => defaultMessage,
    } as IntlShape;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('canReceiveNotifications', () => {
        test('handles PUSH_PROXY_RESPONSE_NOT_AVAILABLE', async () => {
            const serverUrl = 'https://example.com';
            (pushDisabledInServerAck as jest.Mock).mockResolvedValue(false);

            await canReceiveNotifications(serverUrl, PUSH_PROXY_RESPONSE_NOT_AVAILABLE, intl);

            expect(EphemeralStore.setPushProxyVerificationState).toHaveBeenCalledWith(serverUrl, PUSH_PROXY_STATUS_NOT_AVAILABLE);
            expect(Alert.alert).toHaveBeenCalled();
        });

        test('handles PUSH_PROXY_RESPONSE_UNKNOWN', async () => {
            const serverUrl = 'https://example.com';
            (pushDisabledInServerAck as jest.Mock).mockResolvedValue(false);

            await canReceiveNotifications(serverUrl, PUSH_PROXY_RESPONSE_UNKNOWN, intl);

            expect(EphemeralStore.setPushProxyVerificationState).toHaveBeenCalledWith(serverUrl, PUSH_PROXY_STATUS_UNKNOWN);
            expect(Alert.alert).toHaveBeenCalled();
        });

        test('handles default case', async () => {
            const serverUrl = 'https://example.com';
            (pushDisabledInServerAck as jest.Mock).mockResolvedValue(false);

            await canReceiveNotifications(serverUrl, 'some_other_response', intl);

            expect(EphemeralStore.setPushProxyVerificationState).toHaveBeenCalledWith(serverUrl, PUSH_PROXY_STATUS_VERIFIED);
            expect(Alert.alert).not.toHaveBeenCalled();
        });
    });

    describe('alertPushProxyError', () => {
        test('displays alert with correct messages', () => {
            const serverUrl = 'https://example.com';
            const alert = jest.spyOn(Alert, 'alert');

            alertPushProxyError(intl, serverUrl);

            expect(Alert.alert).toHaveBeenCalledWith(
                'Notifications cannot be received from this server',
                'Due to the configuration of this server, notifications cannot be received in the mobile app. Contact your system admin for more information.',
                [{
                    text: 'Okay',
                    onPress: expect.any(Function),
                }],
            );

            alert?.mock.calls?.[0]?.[2]?.[0]?.onPress?.();
            expect(storePushDisabledInServerAcknowledged).toHaveBeenCalled();
        });
    });

    describe('alertPushProxyUnknown', () => {
        test('displays alert with correct messages', () => {
            alertPushProxyUnknown(intl);

            expect(Alert.alert).toHaveBeenCalledWith(
                'Notifications could not be received from this server',
                'This server was unable to receive push notifications for an unknown reason. This will be attempted again next time you connect.',
                [{
                    text: 'Okay',
                }],
            );
        });
    });

    describe('handleAlertResponse', () => {
        const handleAlertResponse = async (buttonIndex: number, serverUrl?: string) => {
            if (buttonIndex === 0 && serverUrl) {
                await storePushDisabledInServerAcknowledged(urlSafeBase64Encode(serverUrl));
            }
        };

        test('stores acknowledgment when buttonIndex is 0 and serverUrl is provided', async () => {
            const serverUrl = 'https://example.com';
            await handleAlertResponse(0, serverUrl);
            expect(storePushDisabledInServerAcknowledged).toHaveBeenCalledWith('encoded-https://example.com');
        });

        test('does not store acknowledgment when buttonIndex is not 0', async () => {
            const serverUrl = 'https://example.com';
            await handleAlertResponse(1, serverUrl);
            expect(storePushDisabledInServerAcknowledged).not.toHaveBeenCalled();
        });

        test('does not store acknowledgment when serverUrl is not provided', async () => {
            await handleAlertResponse(0);
            expect(storePushDisabledInServerAcknowledged).not.toHaveBeenCalled();
        });
    });
});
