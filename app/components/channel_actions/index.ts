// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observeCanWriteDmGm} from '@queries/servers/dm_gm_access';
import {observeCanManageChannelMembers} from '@queries/servers/role';
import {observeCurrentUser} from '@queries/servers/user';

import ChannelActions from './channel_actions';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    const channelType = observeChannel(database, channelId).pipe(
        switchMap((c) => of$(c?.type)),
    );

    const canManageMembers = observeCurrentUser(database).pipe(
        switchMap((u) => (u ? observeCanManageChannelMembers(database, channelId, u) : of$(false))),
    );
    return {
        channelType,
        canManageMembers,

        // Only shown in conversations, where setting the header is a DM/GM write.
        canSetHeader: observeCanWriteDmGm(database),
    };
});

export default withDatabase(enhanced(ChannelActions));
