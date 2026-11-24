// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applicationId} from 'expo-application';
import {Platform} from 'react-native';

// The Android share extension rejects files served by this app, so it must not be offered as a target for them.
export const EXCLUDE_THIS_APP_FROM_FILE_SHARE = Platform.select({
    android: applicationId ? [applicationId] : undefined,
});
