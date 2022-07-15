// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCallsConfig, observeChannelsWithCalls, observeCurrentCall} from '@calls/state';
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
    );
    const isCallInCurrentChannel = combineLatest([channelId, observeChannelsWithCalls(serverUrl)]).pipe(
        switchMap(([id, calls]) => of$(Boolean(calls[id]))),
    );
    const isInCall = observeCurrentCall().pipe(
        switchMap((call) => of$(Boolean(call))),
    );

    return {
        channelId,
        isCallsPluginEnabled,
        isCallInCurrentChannel,
        isInCall,
    };
});

export default withDatabase(withServerUrl(enhanced(Channel)));
