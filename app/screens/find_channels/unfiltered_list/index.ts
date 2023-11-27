// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {Observable, of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {queryMyRecentChannels} from '@queries/servers/channel';
import {queryJoinedTeams} from '@queries/servers/team';
import {removeChannelsFromArchivedTeams, retrieveChannels} from '@screens/find_channels/utils';

import UnfilteredList from './unfiltered_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const MAX_CHANNELS = 20;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const teamsCount = queryJoinedTeams(database).observeCount();
    const teamIds: Observable<Set<string>> = queryJoinedTeams(database).observe().pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((teams) => of$(new Set(teams.map((t) => t.id)))),
    );

    const recentChannels = queryMyRecentChannels(database, MAX_CHANNELS).
        observeWithColumns(['last_viewed_at']).pipe(
            switchMap((myChannels) => retrieveChannels(database, myChannels, true)),
            combineLatestWith(teamIds),
            switchMap(([myChannels, tmIds]) => of$(removeChannelsFromArchivedTeams(myChannels, tmIds))),
        );

    return {
        recentChannels,
        showTeamName: teamsCount.pipe(switchMap((count) => of$(count > 1))),
    };
});

export default withDatabase(enhanced(UnfilteredList));
