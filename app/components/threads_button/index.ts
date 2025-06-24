// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from 'rxjs/operators';

import {observeCurrentChannelId, observeCurrentTeamId} from '@queries/servers/system';
import {observeTeamLastChannelId} from '@queries/servers/team';
import {observeUnreadsAndMentions} from '@queries/servers/thread';

import ThreadsButton from './threads_button';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);

    return {
        currentChannelId: observeCurrentChannelId(database),
        lastChannelId: currentTeamId.pipe(
            switchMap(
                (teamId) => observeTeamLastChannelId(database, teamId),
            ),
        ),
        unreadsAndMentions: currentTeamId.pipe(
            switchMap(
                (teamId) => observeUnreadsAndMentions(database, {teamId, includeDmGm: true}),
            ),
        ),
    };
});

export default withDatabase(enhanced(ThreadsButton));
