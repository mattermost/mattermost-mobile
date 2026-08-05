// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeEventEmitter, NativeModules, Platform, type EmitterSubscription} from 'react-native';

import {
    CallsNativeEvents,
    type CallActionPayload,
    type CallMutePayload,
    type ForegroundNotificationConfig,
    type IncomingCallPayload,
    type OutgoingCallParams,
    type EndCallReason,
    type Spec,
    type VoIPTokenUpdated,
} from './NativeMMCallsNative';

const LINKING_ERROR =
  'The package \'@mattermost/calls-native\' doesn\'t seem to be linked. Make sure: \n\n' +
  Platform.select({ios: "- You have run 'pod install'\n", default: ''}) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error global
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const CallsNativeModule: Spec = isTurboModuleEnabled ? require('./NativeMMCallsNative').default : NativeModules.MMCallsNative;

const CallsNative = CallsNativeModule || new Proxy(
    {},
    {
        get() {
            throw new Error(LINKING_ERROR);
        },
    },
);

type CallsNativeSpec = Spec & {
    onVoIPTokenUpdated: (listener: (event: VoIPTokenUpdated) => void) => EmitterSubscription;
    onIncomingCall: (listener: (event: IncomingCallPayload) => void) => EmitterSubscription;
    onCallAnswered: (listener: (event: CallActionPayload) => void) => EmitterSubscription;
    onCallDeclined: (listener: (event: CallActionPayload) => void) => EmitterSubscription;
    onCallEnded: (listener: (event: CallActionPayload) => void) => EmitterSubscription;
    onMuteChanged: (listener: (event: CallMutePayload) => void) => EmitterSubscription;
};

const emitter = new NativeEventEmitter(CallsNative as Spec);

export type {
    CallsNativeSpec,
    CallActionPayload,
    CallMutePayload,
    ForegroundNotificationConfig,
    IncomingCallPayload,
    OutgoingCallParams,
    EndCallReason,
    VoIPTokenUpdated,
};

const CallsNativeWithEvents: CallsNativeSpec = Object.assign(CallsNative as Spec, {
    onVoIPTokenUpdated: (listener: (event: VoIPTokenUpdated) => void) =>
        emitter.addListener(CallsNativeEvents.VoIPTokenUpdated, listener),
    onIncomingCall: (listener: (event: IncomingCallPayload) => void) =>
        emitter.addListener(CallsNativeEvents.IncomingCall, listener),
    onCallAnswered: (listener: (event: CallActionPayload) => void) =>
        emitter.addListener(CallsNativeEvents.CallAnswered, listener),
    onCallDeclined: (listener: (event: CallActionPayload) => void) =>
        emitter.addListener(CallsNativeEvents.CallDeclined, listener),
    onCallEnded: (listener: (event: CallActionPayload) => void) =>
        emitter.addListener(CallsNativeEvents.CallEnded, listener),
    onMuteChanged: (listener: (event: CallMutePayload) => void) =>
        emitter.addListener(CallsNativeEvents.CallMuted, listener),
});

export default CallsNativeWithEvents;
