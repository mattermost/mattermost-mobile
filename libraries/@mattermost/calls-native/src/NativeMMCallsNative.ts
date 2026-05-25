// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type TurboModule, TurboModuleRegistry} from 'react-native';

export type VoIPTokenUpdated = Readonly<{
  token: string;
}>

export type IncomingCallPayload = Readonly<{
  uuid: string; // Native call UUID (lower-case, hyphenated)
  channelId: string;
  serverId: string;
  postId: string;
  threadId: string;
  callerId: string;
  callerName: string;
}>

export type CallActionPayload = Readonly<{
  uuid: string;
}>

export type CallMutePayload = Readonly<{
  uuid: string;
  muted: boolean;
}>

export type OutgoingCallParams = Readonly<{
  channelId: string;
  calleeName: string;
}>

// Configuration for the Android foreground-service notification that keeps
// the microphone alive during a call.
export type ForegroundNotificationConfig = Readonly<{
  channelId: string;
  channelName: string;
  channelDescription: string;
  title: string;
  text: string;
}>

// JS → native call-end reasons. The native side maps these to the matching
// CXCallEndedReason where applicable.
export type EndCallReason =
  | 'remoteEnded'
  | 'failed'
  | 'unanswered'
  | 'declined';

// Event names — values must match the native Event enum
export const CallsNativeEvents = {
    VoIPTokenUpdated: 'VoIPTokenUpdated',
    IncomingCall: 'IncomingCall',
    CallAnswered: 'CallAnswered',
    CallDeclined: 'CallDeclined',
    CallEnded: 'CallEnded',
    CallMuted: 'CallMuted',
} as const;

export interface Spec extends TurboModule {

    addListener: (eventType: string) => void;
    removeListeners: (count: number) => void;

    // JS → native: surface a call we initiated in-app into native so the
    // user gets lock-screen / control-center UI when the app backgrounds.
    reportOutgoingCall: (params: OutgoingCallParams) => Promise<CallActionPayload>;

    // JS → native: transition the call from "connecting" to "connected" so
    // native shows a running timer.
    reportConnected: (uuid: string) => Promise<void>;

    // JS → native: close the native overlay (remote hang-up, RTC failure,
    // or unanswered).
    reportEnded: (uuid: string, reason: EndCallReason) => Promise<void>;

    // JS → native: reflect in-app mute toggles into native (the reverse
    // direction arrives via the CallMuted event).
    setMuted: (uuid: string, muted: boolean) => Promise<void>;

    // JS → native: start/stop the Android foreground service that keeps the
    // microphone alive while the app is backgrounded.
    foregroundServiceStart: (config: ForegroundNotificationConfig) => void;
    foregroundServiceStop: () => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('MMCallsNative');
