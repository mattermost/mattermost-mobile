// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryMyRecentChannels} from '@queries/servers/channel';
import {queryJoinedTeams} from '@queries/servers/team';
import {retrieveChannels} from '@screens/find_channels/utils';

import Recent from './recent';

import type {WithDatabaseArgs} from '@typings/database/database';

const MAX_CHANNELS = 20;

const enhanced = withObservables(['database'], ({database}: WithDatabaseArgs) => {
    const teamsCount = queryJoinedTeams(database).observeCount();

    const recentChannels = queryMyRecentChannels(database, MAX_CHANNELS).
        observeWithColumns(['last_viewed_at']).pipe(
            switchMap((myChannels) => retrieveChannels(database, myChannels, true)),
        );

    return {
        recentChannels,
        showTeamName: teamsCount.pipe(switchMap((count) => of$(count > 1))),
    };
});

export default enhanced(Recent);
