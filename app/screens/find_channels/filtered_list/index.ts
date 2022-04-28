// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeDirectChannelsByTerm, observeJoinedChannelsByTerm} from '@queries/servers/channel';
import {queryJoinedTeams} from '@queries/servers/team';
import {retrieveChannels} from '@screens/find_channels/utils';

import FilteredList from './filtered_list';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    term: string;
}

const MAX_RESULTS = 20;

const enhanced = withObservables(['term'], ({database, term}: EnhanceProps) => {
    const teamsCount = queryJoinedTeams(database).observeCount();
    const joinedChannelsMatchStart = observeJoinedChannelsByTerm(database, term, MAX_RESULTS, true);
    const joinedChannelsMatch = observeJoinedChannelsByTerm(database, term, MAX_RESULTS);
    const directChannelsMatchStart = observeDirectChannelsByTerm(database, term, MAX_RESULTS, true);
    const directChannelsMatch = observeDirectChannelsByTerm(database, term, MAX_RESULTS);

    const channelsMatchStart = combineLatest([joinedChannelsMatchStart, directChannelsMatchStart]).pipe(
        switchMap((matchStart) => retrieveChannels(database, matchStart.flat(), true)),
    );

    const channelsMatch = combineLatest([joinedChannelsMatch, directChannelsMatch]).pipe(
        switchMap((matchStart) => retrieveChannels(database, matchStart.flat(), true)),
    );

    return {
        channelsMatch,
        channelsMatchStart,
        showTeamName: teamsCount.pipe(switchMap((count) => of$(count > 1))),
    };
});

export default withDatabase(enhanced(FilteredList));
