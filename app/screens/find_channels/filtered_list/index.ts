// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryJoinedTeams} from '@queries/servers/team';

import FilteredList from './filtered_list';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    term: string;
}

const enhanced = withObservables([], ({database}: EnhanceProps) => {
    const teamsCount = queryJoinedTeams(database).observeCount();

    return {
        showTeamName: teamsCount.pipe(switchMap((count) => of$(count > 1))),
    };
});

export default withDatabase(enhanced(FilteredList));
