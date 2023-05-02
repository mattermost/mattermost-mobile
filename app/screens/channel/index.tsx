// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeCallsChannelState, observeIsCallsEnabledInChannel} from '@calls/observers';
import {withServerUrl} from '@context/server';
import {observeCurrentChannelId} from '@queries/servers/system';

import Channel from './channel';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
}

const enhanced = withObservables([], ({database, serverUrl}: EnhanceProps) => {
    const channelId = observeCurrentChannelId(database);

    return {
        channelId,
        callsChannelState: observeCallsChannelState(database, serverUrl, channelId),
        isCallsEnabledInChannel: observeIsCallsEnabledInChannel(database, serverUrl, channelId),
    };
});

export default withDatabase(withServerUrl(enhanced(Channel)));
