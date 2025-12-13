// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {TurboModuleRegistry, NativeModules, Platform, type TurboModule} from 'react-native';

export interface Spec extends TurboModule {
  installRustCrate(): boolean;
  cleanupRustCrate(): boolean;
}

// Support both old and new architecture
const LINKING_ERROR =
  'The package \'@mattermost/e2ee\' doesn\'t seem to be linked. Make sure: \n\n' +
  Platform.select({ios: "- You have run 'pod install'\n", default: ''}) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const isTurboModuleEnabled = (global as {__turboModuleProxy?: unknown}).__turboModuleProxy != null;

const MattermostE2eeModule = isTurboModuleEnabled
    ? TurboModuleRegistry.getEnforcing<Spec>('MattermostE2ee')
    : NativeModules.MattermostE2ee;

export default MattermostE2eeModule || new Proxy(
    {},
    {
        get() {
            throw new Error(LINKING_ERROR);
        },
    },
);
