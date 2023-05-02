// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCallsChannelState} from '@calls/observers';
import {withServerUrl} from '@context/server';
import {observePost} from '@queries/servers/post';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import Thread from './thread';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
    rootId: string;
}

const enhanced = withObservables(['rootId'], ({database, serverUrl, rootId}: EnhanceProps) => {
    const rootPost = observePost(database, rootId);
    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        callsChannelState: observeCallsChannelState(database, serverUrl, rootPost.pipe(
            switchMap((r) => of$(r?.channelId || ''))),
        ),
        rootPost,
    };
});

export default withDatabase(withServerUrl(enhanced(Thread)));
