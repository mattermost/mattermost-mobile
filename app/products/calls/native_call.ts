// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CallsNative from '@mattermost/calls-native';
import {Platform} from 'react-native';

import {getCurrentCall} from '@calls/state';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {getChannelById} from '@queries/servers/channel';
import {getTeamById} from '@queries/servers/team';
import {logDebug} from '@utils/log';

import {
    clearNativeCallMapping as clearMapping,
    type NativeCallMapping,
    getNativeCallMapping,
    getNativeCallUUIDForCall,
    hasActiveNativeCall,
    setNativeCallMapping,
} from './native_call_mappings';

import type {Database} from '@nozbe/watermelondb';

// Local re-imports used below.
export {
    type NativeCallMapping,
    getNativeCallMapping,
    getNativeCallUUIDForCall,
    hasActiveNativeCall,
    setNativeCallMapping,
};

// Wraps the mapping-store clear so we can notify the WS manager when the
// last call ends — it held the WS open through the call's background time
// and now can resume the standard background-close grace period.
export const clearNativeCallMapping = (uuid: string) => {
    clearMapping(uuid);
    if (!hasActiveNativeCall()) {
        WebsocketManager.scheduleBackgroundCloseIfNeeded();
    }
};

// Single-char ellipsis truncation — preserves the leading portion which
// is the most meaningful (channel name, person list, team name).
const truncateForDisplay = (s: string, max: number): string => {
    if (s.length <= max) {
        return s;
    }
    return s.slice(0, max - 1) + '…';
};

// Builds the name the system call UI shows on the lock screen.
// DM/GM channels already have a person-shaped displayName,
// so we use it as-is. public/private channels
// share names across teams ("Town Square" exists everywhere), so we
// suffix the team to disambiguate. Per-segment truncation keeps both
// ends visible when either is long.
const buildDisplayName = async (database: Database, channelId: string): Promise<string> => {
    const channel = await getChannelById(database, channelId);
    if (!channel) {
        return '';
    }
    const channelName = truncateForDisplay(channel.displayName || '', 40);
    if (!channel.teamId) {
        return channelName;
    }
    const team = await getTeamById(database, channel.teamId);
    if (!team) {
        return truncateForDisplay(channel.displayName || '', 70);
    }
    const teamName = truncateForDisplay(team.displayName || '', 30);
    return `${channelName} (${teamName})`;
};

// Registers an outbound or in-app-joined call with the system call UI so
// the user gets lock-screen / control-center controls if they background
// or lock mid-call. Returns the issued UUID, or undefined when skipped
// (non-iOS, mapping already exists, or the native call failed). The
// caller drives reportConnected once RTC handshakes — only the path that
// registered should call it.
export const registerOutgoingNativeCall = async (serverUrl: string, channelId: string, threadId = ''): Promise<string | undefined> => {
    if (Platform.OS !== 'ios') {
        return undefined;
    }
    if (getNativeCallUUIDForCall(serverUrl, channelId)) {
        return undefined;
    }

    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        let calleeName = '';
        try {
            calleeName = await buildDisplayName(database, channelId);
        } catch (err) {
            logDebug('registerOutgoingNativeCall: buildDisplayName failed', err);
        }
        try {
            const {uuid} = await CallsNative.reportOutgoingCall({channelId, calleeName});
            setNativeCallMapping(uuid, {serverUrl, channelId, postId: '', threadId});
            return uuid;
        } catch (err) {
            logDebug('CallsNative.reportOutgoingCall failed', err);
            return undefined;
        }
    } catch {
        return undefined;
    }
};

// Transitions a registered call from "connecting" to "connected" — used
// after RTC has finished its handshake so the system UI starts its call
// timer. Safe to call multiple times; no-op when uuid is undefined.
export const reportNativeCallConnected = (uuid: string | undefined) => {
    if (!uuid) {
        return;
    }
    CallsNative.reportConnected(uuid).catch((err) => {
        logDebug('CallsNative.reportConnected failed', err);
    });
};

// Tears down the system call UI when the RTC connection closes — covers
// the remote-end-hangs-up case, where no JS code explicitly ended the
// call but the system UI overlay would otherwise remain "in progress."
export const endNativeCall = (
    serverUrl: string,
    channelId: string,
    reason: 'unanswered' | 'answeredElsewhere' | 'declinedElsewhere' | 'remoteEnded' | 'failed',
) => {
    if (Platform.OS !== 'ios') {
        return;
    }
    const uuid = getNativeCallUUIDForCall(serverUrl, channelId);
    if (!uuid) {
        return;
    }
    clearNativeCallMapping(uuid);
    CallsNative.reportEnded(uuid, reason).catch((err) => {
        logDebug('CallsNative.reportEnded failed', err);
    });
};

// Reflects in-app mute state into the system call UI overlay so the
// lock-screen mute indicator stays in sync.
// No-op when there's no UUID for the current call (foreground-only
// call that was never registered).
export const mirrorMuteToNativeCall = (muted: boolean) => {
    if (Platform.OS !== 'ios') {
        return;
    }
    const currentCall = getCurrentCall();
    if (!currentCall) {
        return;
    }
    const uuid = getNativeCallUUIDForCall(currentCall.serverUrl, currentCall.channelId);
    if (!uuid) {
        return;
    }
    CallsNative.setMuted(uuid, muted).catch((err) => {
        logDebug('CallsNative.setMuted failed', err);
    });
};
