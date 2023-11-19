// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, distinctUntilChanged, of as of$, switchMap} from 'rxjs';

import {observeIsCallsEnabledInChannel} from '@calls/observers';
import {
    observeCallsState,
    observeChannelsWithCalls,
    observeCurrentCall,
    observeIncomingCalls,
} from '@calls/state';
import {Preferences} from '@constants';
import {withServerUrl} from '@context/server';
import {observeCurrentChannel} from '@queries/servers/channel';
import {observeHasGMasDMFeature} from '@queries/servers/features';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';

import Channel from './channel';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
}

const enhanced = withObservables([], ({database, serverUrl}: EnhanceProps) => {
    const channelId = observeCurrentChannelId(database);

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

    const dismissedGMasDMNotice = queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.SYSTEM_NOTICE, Preferences.NOTICES.GM_AS_DM).observe();
    const channelType = observeCurrentChannel(database).pipe(switchMap((c) => of$(c?.type)));
    const currentUserId = observeCurrentUserId(database);
    const hasGMasDMFeature = observeHasGMasDMFeature(database);

    return {
        channelId,
        showJoinCallBanner,
        isInACall,
        showIncomingCalls,
        isCallsEnabledInChannel: observeIsCallsEnabledInChannel(database, serverUrl, channelId),
        dismissedGMasDMNotice,
        channelType,
        currentUserId,
        hasGMasDMFeature,
    };
});

export default withDatabase(withServerUrl(enhanced(Channel)));
