// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AsyncStorage from '@react-native-community/async-storage';
import {Device} from 'app/constants';

if (Device.IS_TABLET) {
    // TODO: Use the default database to set this property

    AsyncStorage.getItem(Device.PERMANENT_SIDEBAR_SETTINGS).then((value) => {
        if (!value) {
            AsyncStorage.setItem(Device.PERMANENT_SIDEBAR_SETTINGS, 'true');
        }
    });
}
