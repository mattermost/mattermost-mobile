// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import CallsChannelInfo from '@calls/components/calls_channel_info/calls_channel_info';
import {observeCallsConfig, observeCallsState, observeCurrentCall} from '@calls/state';
import DatabaseManager from '@database/manager';
import {observeChannel} from '@queries/servers/channel';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeCurrentUser, observeUserIsChannelAdmin} from '@queries/servers/user';
import {isSystemAdmin} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    channelId: string;
    serverUrl: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database, serverUrl}: EnhanceProps) => {
    const channel = observeChannel(database, channelId);
    const channelAdmin = observeCurrentUserId(database).pipe(
        switchMap((id) => observeUserIsChannelAdmin(database, id, channelId)),
    );
    const systemAdmin = observeCurrentUser(database).pipe(
        switchMap((u) => (u ? of$(u.roles) : of$(''))),
        switchMap((roles) => of$(isSystemAdmin(roles || ''))),
    );
    const callsConfig = observeCallsConfig(serverUrl);
    const callsState = observeCallsState(serverUrl);
    const explicitlyDisabled = callsState.pipe(
        switchMap((cs) => of$(cs.enabled.hasOwnProperty(channelId) && !cs.enabled[channelId])),
    );
    const explicitlyEnabled = callsState.pipe(
        switchMap((cs) => of$(cs.enabled.hasOwnProperty(channelId) && cs.enabled[channelId])),
    );
    const currentCall = observeCurrentCall();
    const currentCallDatabase = currentCall.pipe(
        switchMap((call) => of$(call ? call.serverUrl : '')),
        switchMap((url) => of$(DatabaseManager.serverDatabases[url]?.database)),
    );
    const currentCallChannelName = combineLatest([currentCallDatabase, currentCall]).pipe(
        switchMap(([db, cc]) => (db && cc ? observeChannel(db, cc.channelId) : of$(undefined))),
        switchMap((c) => of$(c?.displayName || '')),
    );

    return {
        channel,
        channelAdmin,
        systemAdmin,
        callsConfig,
        explicitlyDisabled,
        explicitlyEnabled,
        currentCall,
        currentCallChannelName,
    };
});

export default withDatabase(enhanced(CallsChannelInfo));
