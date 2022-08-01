// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCallsConfig, observeCallsState, observeChannelsWithCalls, observeCurrentCall} from '@calls/state';
import {withServerUrl} from '@context/server';
import {observeCurrentChannelId} from '@queries/servers/system';

import Channel from './channel';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
}

const enhanced = withObservables([], ({database, serverUrl}: EnhanceProps) => {
    const channelId = observeCurrentChannelId(database);
    const isCallsPluginEnabled = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.pluginEnabled)),
        distinctUntilChanged(),
    );
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
        switchMap((call) => of$(Boolean(call))),
        distinctUntilChanged(),
    );
    const isInCurrentChannelCall = combineLatest([channelId, ccChannelId]).pipe(
        switchMap(([id, ccId]) => of$(id === ccId)),
        distinctUntilChanged(),
    );
    const callsStateEnabledDict = observeCallsState(serverUrl).pipe(
        switchMap((state) => of$(state.enabled)),
        distinctUntilChanged(), // Did the enabled object ref change? If so, a channel's enabled state has changed.
    );
    const callsDefaultEnabled = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.DefaultEnabled)),
        distinctUntilChanged(),
    );
    const isCallsEnabledInChannel = combineLatest([channelId, callsStateEnabledDict, callsDefaultEnabled]).pipe(
        switchMap(([id, enabled, defaultEnabled]) => {
            const explicitlyEnabled = enabled.hasOwnProperty(id as string) && enabled[id];
            const explicitlyDisabled = enabled.hasOwnProperty(id as string) && !enabled[id];
            return of$(explicitlyEnabled || (!explicitlyDisabled && defaultEnabled));
        }),
        distinctUntilChanged(),
    );

    return {
        channelId,
        isCallsPluginEnabled,
        isCallInCurrentChannel,
        isInACall,
        isInCurrentChannelCall,
        isCallsEnabledInChannel,
    };
});

export default withDatabase(withServerUrl(enhanced(Channel)));
