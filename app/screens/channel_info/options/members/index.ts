// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel, observeChannelInfo} from '@queries/servers/channel';

import Members from './members';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    const info = observeChannelInfo(database, channelId);

    const displayName = observeChannel(database, channelId).pipe(
        switchMap((c) => of$(c?.displayName)));

    const count = info.pipe(
        switchMap((i) => of$(i?.memberCount || 0)),
    );

    return {
        displayName,
        count,
    };
});

export default withDatabase(enhanced(Members));
