// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable no-unused-vars */
import {Sentry} from 'react-native-sentry';

import Mattermost from 'app/mattermost';

import Config from 'assets/config';

if (Config.SentryEnabled && Config.SentryDsnIos) {
    console.warn('Sentry enabled');
    Sentry.config(Config.SentryDsnAndroid, Config.SentryOptions).install();
} else {
    console.warn('Sentry NOT enabled');
    Sentry.config('');
}

const app = new Mattermost();
