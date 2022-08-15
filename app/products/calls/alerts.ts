// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import type {IntlShape} from 'react-intl';

export const showLimitRestrictedAlert = (intl: IntlShape) => {
    const title = intl.formatMessage({
        id: 'mobile.calls_participant_limit_title',
        defaultMessage: 'Participant limit reached',
    });
    const message = intl.formatMessage({
        id: 'mobile.calls_limit_msg',
        defaultMessage: 'Please contact your System Admin to increase the maximum number of participants per call.',
    });
    const ok = intl.formatMessage({
        id: 'mobile.calls_ok',
        defaultMessage: 'OK',
    });

    Alert.alert(
        title,
        message,
        [
            {
                text: ok,
                style: 'cancel',
            },
        ],
    );
};
