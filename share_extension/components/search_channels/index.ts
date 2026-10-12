// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {observeArchiveChannelsByTerm, observeDirectChannelsByTerm, observeJoinedChannelsByTerm} from '@queries/servers/channel';
import {queryJoinedTeams} from '@queries/servers/team';
import {retrieveChannels} from '@screens/find_channels/utils';

import SearchChannels, {MAX_RESULTS} from './search_channels';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    term: string;
}

const enhanced = withObservables(['term', 'database'], ({database, term}: EnhanceProps) => {
    const teamsCount = queryJoinedTeams(database).observeCount();
    const joinedChannelsMatchStart = observeJoinedChannelsByTerm(database, term, MAX_RESULTS, true);
    const joinedChannelsMatch = observeJoinedChannelsByTerm(database, term, MAX_RESULTS);
    const directChannelsMatchStart = observeDirectChannelsByTerm(database, term, MAX_RESULTS, true);
    const directChannelsMatch = observeDirectChannelsByTerm(database, term, MAX_RESULTS);

    const channelsMatchStart = joinedChannelsMatchStart.pipe(
        combineLatestWith(directChannelsMatchStart),
        switchMap((matchStart) => {
            return retrieveChannels(database, matchStart.flat(), true);
        }),
    );

    const channelsMatch = joinedChannelsMatch.pipe(
        combineLatestWith(directChannelsMatch),
        switchMap((matched) => retrieveChannels(database, matched.flat(), true)),
    );

    const archivedChannels = observeArchiveChannelsByTerm(database, term, MAX_RESULTS).pipe(
        switchMap((archived) => retrieveChannels(database, archived)),
    );

    return {
        archivedChannels,
        channelsMatch,
        channelsMatchStart,
        showTeamName: teamsCount.pipe(switchMap((count) => of$(count > 1))),
    };
});

export default enhanced(SearchChannels);
