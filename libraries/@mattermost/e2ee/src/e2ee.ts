// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules} from 'react-native';

import E2eeModule, {helloFromRust, greet} from './generated/mattermost_e2ee';

// Install the Rust crate into the JSI runtime
// This makes the native functions available to JavaScript
const {MattermostE2ee} = NativeModules;
if (MattermostE2ee?.installRustCrate) {
    MattermostE2ee.installRustCrate();
}

// Initialize the uniffi module
E2eeModule.initialize();

// Export the functions
export {helloFromRust, greet};
