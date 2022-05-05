// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {getTeamSearchHistory, queryTeamSearchHistoryById} from '@app/queries/servers/team';
import {observeConfigBooleanValue, observeCurrentTeamId} from '@queries/servers/system';
import {queryJoinedTeams} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';
import {getTimezone} from '@utils/user';

import SearchScreen from './search';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);
    const currentTeamId = observeCurrentTeamId(database);
    const viewArchivedChannels = observeConfigBooleanValue(database, 'ExperimentalViewArchivedChannels');
    console.log('\n<><><> INSIDE enhance function');
    const teamsCount = queryJoinedTeams(database).observe();
    teamsCount.subscribe((count) => {
        console.log('teamsCount', count);
        return of$(count);
    });

    // const recent = getTeamSearchHistory(database, currentTeamId);
    // const recent = queryTeamSearchHistoryById(database, currentTeamId);
    // const recent = queryTeamSearchHistoryById(database, currentTeamId.pipe(map(rows) => {
    //         return of$([]);
    // }));

    // const recent = queryTeamSearchHistoryById(database, currentTeamId.pipe((switchMap((team) => of$(team)));

    return {

        // archivedPostIds,
        currentTeamId,
        teamsCount,

        // initialValue,
        // isSearchGettingMore,
        // postIds,
        // recent,

        // timezoneOffsetInSeconds,
        viewArchivedChannels,

        // currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
    };
});

export default compose(
    withDatabase,
    enhance,
)(SearchScreen);
