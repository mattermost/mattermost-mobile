// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {distinctUntilChanged, switchMap, combineLatest, Observable, of as of$} from 'rxjs';

import {
    observeCallsConfig,
    observeCallsState,
    observeChannelsWithCalls,
    observeCurrentCall,
    observeIncomingCalls,
} from '@calls/state';
import {fillUserModels, hasOtherUserJoined, userIds} from '@calls/utils';
import {General, License} from '@constants';
import DatabaseManager from '@database/manager';
import {observeChannel} from '@queries/servers/channel';
import {observeConfigValue, observeLicense} from '@queries/servers/system';
import {observeUser, queryUsersById} from '@queries/servers/user';
import UserModel from '@typings/database/models/servers/user';
import {isMinimumServerVersion} from '@utils/helpers';
import {getUserIdFromChannelName, isSystemAdmin} from '@utils/user';

import type {CallSession} from '@calls/types/calls';
import type {Database} from '@nozbe/watermelondb';

export type LimitRestrictedInfo = {
    limitRestricted: boolean;
    maxParticipants: number;
    isCloudStarter: boolean;
}

export const observeIsCallsEnabledInChannel = (database: Database, serverUrl: string, channelId: Observable<string>) => {
    const callsPluginEnabled = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.pluginEnabled)),
        distinctUntilChanged(),
    );
    const callsDefaultEnabled = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.DefaultEnabled)),
        distinctUntilChanged(),
    );
    const callsStateEnabledDict = observeCallsState(serverUrl).pipe(
        switchMap((state) => of$(state.enabled)),
        distinctUntilChanged(), // Did the enabled object ref change? If so, a channel's enabled state has changed.
    );
    const callsGAServer = observeConfigValue(database, 'Version').pipe(
        switchMap((v) => of$(isMinimumServerVersion(v || '', 7, 6))),
    );
    return combineLatest([callsPluginEnabled, channelId, callsStateEnabledDict, callsDefaultEnabled, callsGAServer]).pipe(
        switchMap(([pluginEnabled, id, enabled, defaultEnabled, gaServer]) => {
            if (!pluginEnabled) {
                return of$(false);
            }

            const explicitlyEnabled = enabled.hasOwnProperty(id as string) && enabled[id];
            const explicitlyDisabled = enabled.hasOwnProperty(id as string) && !enabled[id];
            return of$(explicitlyEnabled || (!explicitlyDisabled && defaultEnabled) || (!explicitlyDisabled && gaServer));
        }),
        distinctUntilChanged(),
    ) as Observable<boolean>;
};

export const observeIsCallLimitRestricted = (database: Database, serverUrl: string, channelId: string) => {
    const maxParticipants = observeCallsConfig(serverUrl).pipe(
        switchMap((c) => of$(c.MaxCallParticipants)),
        distinctUntilChanged(),
    );
    const callNumOfParticipants = observeCallsState(serverUrl).pipe(
        switchMap((cs) => of$(Object.keys(cs.calls[channelId]?.sessions || {}).length)),
        distinctUntilChanged(),
    );
    const isCloud = observeLicense(database).pipe(
        switchMap((l) => of$(l?.Cloud === 'true')),
        distinctUntilChanged(),
    );
    const skuShortName = observeCallsConfig(serverUrl).pipe(
        switchMap((c) => of$(c.sku_short_name)),
        distinctUntilChanged(),
    );
    return combineLatest([maxParticipants, callNumOfParticipants, isCloud, skuShortName]).pipe(
        switchMap(([max, numParticipants, cloud, sku]) => of$({
            limitRestricted: max !== 0 && numParticipants >= max,
            maxParticipants: max,
            isCloudStarter: cloud && sku === License.SKU_SHORT_NAME.Starter,
        })),
        distinctUntilChanged((prev, curr) =>
            prev.limitRestricted === curr.limitRestricted && prev.maxParticipants === curr.maxParticipants && prev.isCloudStarter === curr.isCloudStarter),
    ) as Observable<LimitRestrictedInfo>;
};

export const observeCallDatabase = () => {
    const currentCall = observeCurrentCall();
    return currentCall.pipe(
        switchMap((call) => of$(call ? call.serverUrl : '')),
        distinctUntilChanged(),
        switchMap((url) => of$(DatabaseManager.serverDatabases[url]?.database)),
    );
};

// Observes the current call's channel from the call's own server database,
// which is not necessarily the active server's database.
export const observeCallChannel = () => {
    return observeCurrentCall().pipe(
        distinctUntilChanged((a, b) => a?.channelId === b?.channelId && a?.serverUrl === b?.serverUrl),
        switchMap((call) => {
            const db = call ? DatabaseManager.serverDatabases[call.serverUrl]?.database : undefined;
            const id = call?.channelId || '';
            return db && id ? observeChannel(db, id) : of$(undefined);
        }),
    );
};

export const observeCurrentSessionsDict = () => {
    const currentCall = observeCurrentCall();
    const database = observeCallDatabase();

    return combineLatest([database, currentCall]).pipe(
        switchMap(([db, call]) => (db && call ? queryUsersById(db, userIds(Object.values(call.sessions))).observeWithColumns(['nickname', 'username', 'first_name', 'last_name', 'last_picture_update']) : of$([])).pipe(

            // We now have a UserModel[] one for each userId, but we need the session dictionary with user models
            // eslint-disable-next-line max-nested-callbacks
            switchMap((ps: UserModel[]) => of$(fillUserModels(call?.sessions || {}, ps))),
        )),
    ) as Observable<Dictionary<CallSession>>;
};

// DM call phases for the caller: first 'calling' (waiting for pickup), then 'connected'.
// All other calls (GMs, channels, callee-side DMs) are always 'connected'.
// isDMCalling is true if I've started a DM call, am connected, and nobody else has joined yet.
// The ring phase ends for good at the first answer: if the callee later hangs up while I stay in the
// call, their session goes away but dmCalleeAnsweredAt doesn't, so we don't fall back to 'calling'.
export const observeDMCallingState = () => {
    const currentCall = observeCurrentCall();
    const database = observeCallDatabase();
    const channel = combineLatest([database, currentCall]).pipe(
        switchMap(([db, call]) => (db && call ? observeChannel(db, call.channelId) : of$(undefined))),
    );

    // The callee isn't in the call yet, so they come from the DM channel rather than from the sessions.
    // Empty when this isn't a DM, or is a DM with yourself: there's then no other party to wait for.
    const dmCalleeId = combineLatest([currentCall, channel]).pipe(
        switchMap(([call, chan]) => {
            if (!call || chan?.type !== General.DM_CHANNEL) {
                return of$('');
            }

            const calleeId = getUserIdFromChannelName(call.myUserId, chan.name);
            return of$(calleeId === call.myUserId ? '' : calleeId);
        }),
        distinctUntilChanged(),
    );

    const dmCallee = combineLatest([database, dmCalleeId]).pipe(
        switchMap(([db, calleeId]) => (db && calleeId ? observeUser(db, calleeId) : of$(undefined))),
    );

    const isDMCall = dmCalleeId.pipe(
        switchMap((calleeId) => of$(Boolean(calleeId))),
        distinctUntilChanged(),
    );

    const isDMCalling = combineLatest([currentCall, isDMCall]).pipe(
        switchMap(([call, isDM]) => of$(Boolean(
            call &&
            isDM &&
            call.connected &&
            call.ownerId === call.myUserId &&
            !call.dmCalleeAnsweredAt &&
            !hasOtherUserJoined(call.sessions, call.myUserId),
        ))),
        distinctUntilChanged(),
    );

    // TODO: Remove startTime fallback
    // A DM call's duration counts from when it was answered; every other call counts from when it started.
    // The startTime fallback also covers a DM call we never saw answered — joined from a reconnect snapshot, or
    // relaunched straight into an active call. Without it a 0 would reach the timer.
    const dmCalleeAnsweredAt = combineLatest([currentCall, isDMCall]).pipe(
        switchMap(([call, isDM]) => of$((isDM && call?.dmCalleeAnsweredAt) || call?.startTime || 0)),
        distinctUntilChanged(),
    );

    return {
        isDMCall,
        isDMCalling,
        dmCalleeId,
        dmCallee,
        dmCalleeAnsweredAt,
    };
};

export const observeCallStateInChannel = (serverUrl: string, database: Database, channelId: Observable<string>) => {
    const isCallInCurrentChannel = combineLatest([channelId, observeChannelsWithCalls(serverUrl)]).pipe(
        switchMap(([id, calls]) => of$(Boolean(calls[id]))),
        distinctUntilChanged(),
    );
    const currentCall = observeCurrentCall();
    const ccChannelId = currentCall.pipe(
        switchMap((call) => of$(call?.channelId)),
        distinctUntilChanged(),
    );
    const isInACall = currentCall.pipe(
        switchMap((call) => of$(Boolean(call?.connected))),
        distinctUntilChanged(),
    );
    const dismissed = combineLatest([channelId, observeCallsState(serverUrl)]).pipe(
        switchMap(([id, state]) => of$(Boolean(state.calls[id]?.dismissed[state.myUserId]))),
        distinctUntilChanged(),
    );
    const isInCurrentChannelCall = combineLatest([channelId, ccChannelId]).pipe(
        switchMap(([id, ccId]) => of$(id === ccId)),
        distinctUntilChanged(),
    );
    const showJoinCallBanner = combineLatest([isCallInCurrentChannel, dismissed, isInCurrentChannelCall]).pipe(
        switchMap(([isCall, dism, inCurrCall]) => of$(Boolean(isCall && !dism && !inCurrCall))),
        distinctUntilChanged(),
    );
    const showIncomingCalls = observeIncomingCalls().pipe(
        switchMap((ics) => of$(ics.incomingCalls.length > 0)),
        distinctUntilChanged(),
    );

    return {
        showJoinCallBanner,
        isInACall,
        showIncomingCalls,
    };
};

export const observeEndCallDetails = () => {
    const cc = observeCurrentCall();
    const otherParticipants = cc.pipe(
        switchMap((call) => of$(Object.keys(call?.sessions || {}).length > 1)),
        distinctUntilChanged(),
    );
    const isAdmin = cc.pipe(
        switchMap((call) => of$(isSystemAdmin(call?.sessions[call?.mySessionId || '']?.userModel?.roles || ''))),
        distinctUntilChanged(),
    );
    const isHost = cc.pipe(
        switchMap((call) => of$(call ? call.hostId === call.myUserId : false)),
        distinctUntilChanged(),
    );

    return {
        otherParticipants,
        isAdmin,
        isHost,
    };
};
