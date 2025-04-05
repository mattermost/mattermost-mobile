// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';
import {observeTeam} from '@queries/servers/team';

import CopyChannelLinkBox from './copy_channel_link_box';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    const channel = observeChannel(database, channelId);
    const team = channel.pipe(
        switchMap((c) => (c?.teamId ? observeTeam(database, c.teamId) : of$(undefined))),
    );
    const teamName = team.pipe(
        switchMap((t) => of$(t?.name)),
    );

    const channelName = channel.pipe(
        switchMap((c) => of$(c?.name)),
    );
    return {
        channelName,
        teamName,
    };
});

export default withDatabase(enhanced(CopyChannelLinkBox));
