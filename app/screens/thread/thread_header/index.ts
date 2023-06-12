// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {switchMap, of as of$} from 'rxjs';

import {withServerUrl} from '@context/server';
import {observeChannel} from '@queries/servers/channel';
import {observePost} from '@queries/servers/post';

import ThreadHeader from './thread_header';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    threadId: string;
}

const enhanced = withObservables(['threadId'], ({database, threadId}: EnhanceProps) => {
    const displayName = observePost(database, threadId).pipe(
        switchMap((r) => of$(r?.channelId)),
        switchMap((id) => (id ? observeChannel(database, id) : of$(undefined))),
        switchMap((c) => of$(c?.displayName)),
    );

    return {
        displayName,
    };
});

export default withDatabase(withServerUrl(enhanced(ThreadHeader)));
