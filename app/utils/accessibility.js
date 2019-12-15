// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';

export function accessibilityProps(id, disable = false) {
    const disableAccessibility = disable ? {accessible: false} : {};

    if (Platform.OS === 'ios') {
        return {...disableAccessibility, testID: id};
    }

    return {...disableAccessibility, accessibilityLabel: id};
}
