// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

// Setup recommendation from the following blog:
// https://blog.addjam.com/testing-react-native-with-mocha-and-enzyme-6b77cd9e52a1#.2awpwqwwb

/* eslint-disable */

import fs from 'fs';
import path from 'path';
import register from 'babel-core/register';
import mockery from 'mockery';
// import {Sentry} from 'react-native-sentry';

mockery.enable({
    warnOnReplace: false,
    warnOnUnregistered: false
});
mockery.registerMock('react-native', {
    NativeModules: {}
});
mockery.registerMock('react-native-device-info', {
    getDeviceLocale() {
        return 'en';
    }
})
mockery.registerMock('react-native-sentry', {
    Sentry: {
        captureBreadcrumb() {

        }
    }
})

// Ignore all node_modules except these
const modulesToCompile = [
    'react-native'
].map((moduleName) => new RegExp(`/node_modules/${moduleName}`));

const rcPath = path.join(__dirname, '..', '.babelrc');
const source = fs.readFileSync(rcPath).toString();
const config = JSON.parse(source);
config.ignore = function(filename) {
    if (!(/\/node_modules\//).test(filename)) {
        return false;
    }

    const matches = modulesToCompile.filter((regex) => regex.test(filename));
    const shouldIgnore = matches.length === 0;
    return shouldIgnore;
};

register(config);

// Initialize Sentry so that it doesn't complain when the middleware tries to create breadcrumbs
// Sentry.config('');
