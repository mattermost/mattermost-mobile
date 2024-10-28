// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {NativeModules, Platform} from 'react-native';

import type {Spec, SplitView, WindowDimensionsChanged} from './NativeRNUtils';

const LINKING_ERROR =
  'The package \'@mattermost/rnutils\' doesn\'t seem to be linked. Make sure: \n\n' +
  Platform.select({ios: "- You have run 'pod install'\n", default: ''}) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error global
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const RNUtilsModule: Spec = isTurboModuleEnabled ? require('./NativeRNUtils').default : NativeModules.RNUtils;

const RNUtils = RNUtilsModule || new Proxy(
    {},
    {
        get() {
            throw new Error(LINKING_ERROR);
        },
    },
);

export type SplitViewResult = SplitView;

export type WindowDimensions = WindowDimensionsChanged;

export default RNUtils;

