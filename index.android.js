// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

/* eslint-disable no-unused-vars */

// import {AppRegistry} from 'react-native';
import {Sentry} from 'react-native-sentry';

import Mattermost from 'app/mattermost';

import Config from 'assets/config';

if (Config.SentryEnabled && Config.SentryDsnAndroid) {
    console.warn('Sentry enabled');
    Sentry.config(Config.SentryDsnAndroid).install();
} else {
    console.warn('Sentry NOT enabled');
    Sentry.config('');
}

// AppRegistry.registerComponent('Mattermost', () => Mattermost);
const app = new Mattermost();
