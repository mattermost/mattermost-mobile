// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {switchMap} from 'rxjs/operators';

import {observeCurrentChannelId, observeCurrentTeamId, observeOnlyUnreads} from '@queries/servers/system';
import {observeUnreadsAndMentionsInTeam} from '@queries/servers/thread';

import ThreadsButton from './threads_button';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);

    return {
        currentChannelId: observeCurrentChannelId(database),
        onlyUnreads: observeOnlyUnreads(database),
        unreadsAndMentions: currentTeamId.pipe(
            switchMap(
                (teamId) => observeUnreadsAndMentionsInTeam(database, teamId),
            ),
        ),
    };
});

export default withDatabase(enhanced(ThreadsButton));
