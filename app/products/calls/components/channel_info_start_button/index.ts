// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import ChannelInfoStartButton from '@calls/components/channel_info_start_button/channel_info_start_button';
import {observeCurrentCall} from '@calls/state';
import DatabaseManager from '@database/manager';
import {observeChannel} from '@queries/servers/channel';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: EnhanceProps) => {
    const channel = observeChannel(database, channelId);
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
        currentCall,
        currentCallChannelName,
    };
});

export default withDatabase(enhanced(ChannelInfoStartButton));
