// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {distinctUntilChanged, switchMap, of as of$} from 'rxjs';

import {observeCallStateInChannel} from '@calls/observers';
import {withServerUrl} from '@context/server';
import {observePost} from '@queries/servers/post';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';

import Thread from './thread';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
    rootId: string;
}

const enhanced = withObservables(['rootId'], ({database, serverUrl, rootId}: EnhanceProps) => {
    const rId = rootId || EphemeralStore.getCurrentThreadId();
    const rootPost = observePost(database, rId);

    const channelId = rootPost.pipe(
        switchMap((r) => of$(r?.channelId || '')),
        distinctUntilChanged(),
    );

    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        ...observeCallStateInChannel(serverUrl, database, channelId),
        rootId: of$(rId),
        rootPost,
    };
});

export default withDatabase(withServerUrl(enhanced(Thread)));
