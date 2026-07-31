// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const CallTone = {
    JoinSelf: 'join_self',
    JoinUser: 'join_user',
    LeaveSelf: 'leave_self',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type CallTone = typeof CallTone[keyof typeof CallTone];

// react-native-incall-manager's startRingtone/stopRingtone tears down and
// reconfigures the active call's audio session on both platforms (it's built
// for pre-call ringing, not playback alongside a live WebRTC session), so it
// can't be used here without disrupting the ongoing call. @mattermost/calls-native
// (MM-69805, blocked on https://github.com/mattermost/mattermost-mobile/pull/9973)
// will own this instead.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const playCallTone = (tone: CallTone) => undefined;
