// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Alert} from 'react-native';

export function alertErrorWithFallback(intl, error, fallback, values) {
    let msg = error.message;
    if (!msg || msg === 'Network request failed') {
        msg = intl.formatMessage(fallback, values);
    }
    Alert.alert('', msg);
}
