// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

import {
    IntuneEvents,
    type Spec, type MSALIdentity, type IntunePolicy,
    type IntuneEnrollmentChangedEvent, type IntunePolicyChangedEvent,
    type IntuneWipeRequestedEvent, type IntuneAuthRequiredEvent,
    type IntuneConditionalLaunchBlockedEvent, type IntuneIdentitySwitchRequiredEvent,
} from './NativeIntune';

const LINKING_ERROR =
  'The package \'@mattermost/intune\' doesn\'t seem to be linked. Make sure: \n\n' +
  Platform.select({ios: "- You have run 'pod install'\n", default: ''}) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const isTurboModuleEnabled = global.__turboModuleProxy != null;

const IntuneModule: Spec = isTurboModuleEnabled ? require('./NativeIntune').default : NativeModules.RNIntune;

const Intune = IntuneModule || new Proxy(
    {},
    {
        get() {
            throw new Error(LINKING_ERROR);
        },
    },
);

const emitter = new NativeEventEmitter(Intune as Spec);

export type {
    MSALIdentity, IntunePolicy,
    IntuneEnrollmentChangedEvent, IntunePolicyChangedEvent,
    IntuneWipeRequestedEvent, IntuneAuthRequiredEvent,
    IntuneConditionalLaunchBlockedEvent, IntuneIdentitySwitchRequiredEvent,
};

export default {
    onIntuneEnrollmentChanged: (listener: (event: IntuneEnrollmentChangedEvent) => void) => {
        return emitter.addListener(IntuneEvents.IntuneEnrollmentChanged, listener);
    },
    onIntunePolicyChanged: (listener: (event: IntunePolicyChangedEvent) => void) => {
        return emitter.addListener(IntuneEvents.IntunePolicyChanged, listener);
    },
    onIntuneWipeRequested: (listener: (event: IntuneWipeRequestedEvent) => void) => {
        return emitter.addListener(IntuneEvents.IntuneWipeRequested, listener);
    },
    onIntuneAuthRequired: (listener: (event: IntuneAuthRequiredEvent) => void) => {
        return emitter.addListener(IntuneEvents.IntuneAuthRequired, listener);
    },
    onIntuneConditionalLaunchBlocked: (listener: (event: IntuneConditionalLaunchBlockedEvent) => void) => {
        return emitter.addListener(IntuneEvents.IntuneConditionalLaunchBlocked, listener);
    },
    onIntuneIdentitySwitchRequired: (listener: (event: IntuneIdentitySwitchRequiredEvent) => void) => {
        return emitter.addListener(IntuneEvents.IntuneIdentitySwitchRequired, listener);
    },
    ...Intune,
};
