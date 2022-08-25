// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel, observeChannelInfo} from '@queries/servers/channel';

import PinnedMessages from './pinned_messages';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const channel = observeChannel(database, channelId);
    const info = observeChannelInfo(database, channelId);
    const count = info.pipe(
        switchMap((i) => of$(i?.pinnedPostCount || 0)),
    );
    const displayName = channel.pipe(switchMap((c) => of$(c?.displayName)));

    return {
        count,
        displayName,
    };
});

export default withDatabase(enhanced(PinnedMessages));
