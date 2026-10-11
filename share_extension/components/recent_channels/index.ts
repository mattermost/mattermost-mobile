// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryMyRecentChannels} from '@queries/servers/channel';
import {observeCanShareToDmGm} from '@queries/servers/dm_gm_access';
import {queryJoinedTeams} from '@queries/servers/team';
import {retrieveChannels} from '@screens/find_channels/utils';

import Recent from './recent';

import type {WithDatabaseArgs} from '@typings/database/database';

const MAX_CHANNELS = 20;

const enhanced = withObservables(['database'], ({database}: WithDatabaseArgs) => {
    const teamsCount = queryJoinedTeams(database).observeCount();

    // Conversations are left out while a DM/GM policy denies reading or writing them.
    const recentChannels = observeCanShareToDmGm(database).pipe(
        switchMap((canShare) => queryMyRecentChannels(database, MAX_CHANNELS, !canShare).observeWithColumns(['last_viewed_at'])),
        switchMap((myChannels) => retrieveChannels(database, myChannels, true)),
    );

    return {
        recentChannels,
        showTeamName: teamsCount.pipe(switchMap((count) => of$(count > 1))),
    };
});

export default enhanced(Recent);
