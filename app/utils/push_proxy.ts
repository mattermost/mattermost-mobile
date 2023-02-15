// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_RESPONSE_UNKNOWN, PUSH_PROXY_STATUS_NOT_AVAILABLE, PUSH_PROXY_STATUS_UNKNOWN, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import EphemeralStore from '@store/ephemeral_store';

import type {IntlShape} from 'react-intl';

export function canReceiveNotifications(serverUrl: string, verification: string, intl: IntlShape) {
    switch (verification) {
        case PUSH_PROXY_RESPONSE_NOT_AVAILABLE:
            EphemeralStore.setPushProxyVerificationState(serverUrl, PUSH_PROXY_STATUS_NOT_AVAILABLE);
            alertPushProxyError(intl);
            break;
        case PUSH_PROXY_RESPONSE_UNKNOWN:
            EphemeralStore.setPushProxyVerificationState(serverUrl, PUSH_PROXY_STATUS_UNKNOWN);
            alertPushProxyUnknown(intl);
            break;
        default:
            EphemeralStore.setPushProxyVerificationState(serverUrl, PUSH_PROXY_STATUS_VERIFIED);
    }
}

export function alertPushProxyError(intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'alert.push_proxy_error.title',
            defaultMessage: 'Notifications cannot be received from this server',
        }),
        intl.formatMessage({
            id: 'alert.push_proxy_error.description',
            defaultMessage: 'Due to the configuration for this server, notifications cannot be received in the mobile app. Contact your system admin for more information.',
        }),
        [{
            text: intl.formatMessage({id: 'alert.push_proxy.button', defaultMessage: 'Okay'}),
        }],
    );
}

export function alertPushProxyUnknown(intl: IntlShape) {
    Alert.alert(
        intl.formatMessage({
            id: 'alert.push_proxy_unknown.title',
            defaultMessage: 'Notifications could not be received from this server',
        }),
        intl.formatMessage({
            id: 'alert.push_proxy_unknown.description',
            defaultMessage: 'This server was unable to receive push notifications for an unknown reason. This will be attempted again next time you connect.',
        }),
        [{
            text: intl.formatMessage({id: 'alert.push_proxy.button', defaultMessage: 'Okay'}),
        }],
    );
}
