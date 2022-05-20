// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';

import LeaveChannelLabel from './leave_channel_label';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    const channel = observeChannel(database, channelId);
    const displayName = channel.pipe(
        switchMap((c) => of$(c?.displayName)),
    );
    const type = channel.pipe(
        switchMap((c) => of$(c?.type)),
    );

    return {
        displayName,
        type,
    };
});

export default withDatabase(enhanced(LeaveChannelLabel));
