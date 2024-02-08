// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$, switchMap, combineLatestWith} from 'rxjs';

import {observeServerDisplayName} from '@queries/app/servers';
import {observeChannel} from '@queries/servers/channel';
import {observeTeam, queryJoinedTeams} from '@queries/servers/team';
import {observeServerHasChannels} from '@share/queries';

import Options from './options';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    serverUrl?: string;
    channelId?: string;
}

const enhanced = withObservables(['database', 'channelId', 'serverUrl'], ({database, channelId, serverUrl}: Props) => {
    const channel = observeChannel(database, channelId || '');
    const teamsCount = queryJoinedTeams(database).observeCount();
    const team = channel.pipe(
        switchMap((c) => (c?.teamId ? observeTeam(database, c.teamId) : of$(undefined))),
    );

    const channelDisplayName = channel.pipe(
        combineLatestWith(team, teamsCount),
        switchMap(([c, t, count]) => {
            if (!c) {
                return of$(undefined);
            }

            if (t) {
                return of$(count > 1 ? `${c.displayName} (${t.displayName})` : c.displayName);
            }

            return of$(c.displayName);
        }),
    );

    return {
        channelDisplayName,
        serverDisplayName: observeServerDisplayName(serverUrl || ''),
        hasChannels: observeServerHasChannels(serverUrl || ''),
    };
});

export default enhanced(Options);
