// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCallsConfig, observeCallsState} from '@calls/state';
import {General} from '@constants';
import {withServerUrl} from '@context/server';
import {observeCurrentChannel} from '@queries/servers/channel';
import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';
import {observeCurrentUser, observeUserIsChannelAdmin} from '@queries/servers/user';
import {isSystemAdmin} from '@utils/user';

import ChannelInfo from './channel_info';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    serverUrl: string;
}

const enhanced = withObservables([], ({serverUrl, database}: Props) => {
    const channel = observeCurrentChannel(database);
    const type = channel.pipe(switchMap((c) => of$(c?.type)));
    const channelId = channel.pipe(switchMap((c) => of$(c?.id || '')));

    const allowEnableCalls = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.AllowEnableCalls)),
        distinctUntilChanged(),
    );
    const systemAdmin = observeCurrentUser(database).pipe(
        switchMap((u) => (u ? of$(u.roles) : of$(''))),
        switchMap((roles) => of$(isSystemAdmin(roles || ''))),
        distinctUntilChanged(),
    );
    const channelAdmin = combineLatest([observeCurrentUserId(database), channelId]).pipe(
        switchMap(([userId, chId]) => observeUserIsChannelAdmin(database, userId, chId)),
        distinctUntilChanged(),
    );
    const canEnableDisableCalls = combineLatest([type, allowEnableCalls, systemAdmin, channelAdmin]).pipe(
        switchMap(([t, allow, sysAdmin, chAdmin]) => {
            const isDirectMessage = t === General.DM_CHANNEL;
            const isGroupMessage = t === General.GM_CHANNEL;

            const isAdmin = sysAdmin || chAdmin;
            let temp = Boolean(sysAdmin);
            if (allow) {
                temp = Boolean(isDirectMessage || isGroupMessage || isAdmin);
            }
            return of$(temp);
        }),
    );
    const callsDefaultEnabled = observeCallsConfig(serverUrl).pipe(
        switchMap((config) => of$(config.DefaultEnabled)),
        distinctUntilChanged(),
    );
    const callsStateEnabledDict = observeCallsState(serverUrl).pipe(
        switchMap((state) => of$(state.enabled)),
        distinctUntilChanged(), // Did the enabled object ref change? If so, a channel's enabled state has changed.
    );
    const isCallsEnabledInChannel = combineLatest([observeCurrentChannelId(database), callsStateEnabledDict, callsDefaultEnabled]).pipe(
        switchMap(([id, enabled, defaultEnabled]) => {
            const explicitlyEnabled = enabled.hasOwnProperty(id as string) && enabled[id];
            const explicitlyDisabled = enabled.hasOwnProperty(id as string) && !enabled[id];
            return of$(explicitlyEnabled || (!explicitlyDisabled && defaultEnabled));
        }),
        distinctUntilChanged(),
    );

    return {
        type,
        canEnableDisableCalls,
        isCallsEnabledInChannel,
    };
});

export default withDatabase(withServerUrl(enhanced(ChannelInfo)));
