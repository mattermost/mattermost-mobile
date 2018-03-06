// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {
    Alert,
} from 'react-native';
import {toTitleCase} from 'app/utils/general';

export function confirmOutOfOfficeDisabled(intl, status, updateStatus) {
    const userStatusId = 'mobile.reset_status.message_' + status;

    let normalizeStatus = status;
    if (status === 'dnd') {
        normalizeStatus = 'Do Not Disturb';
    }

    Alert.alert(
        intl.formatMessage({
            id: 'mobile.reset_status.title_ooo',
            defaultMessage: 'You are "Out Of Office"',
        }),
        intl.formatMessage({
            id: userStatusId,
            defaultMessage: 'Would you like to switch your status to "{status}"?',
        }, {status: toTitleCase(normalizeStatus)}),
        [{
            text: intl.formatMessage({id: 'mobile.reset_status.alert_cancel', defaultMessage: 'Cancel'}),
        }, {
            text: intl.formatMessage({id: 'mobile.reset_status.alert_ok', defaultMessage: 'OK'}),
            onPress: () => updateStatus(status),
        }],
    );
}
