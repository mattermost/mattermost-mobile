// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import compose from 'lodash/fp/compose';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeTeam, queryTeamSearchHistoryByTeamId} from '@queries/servers/team';

import Initial from './initial';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    teamId: string;
}

const enhance = withObservables(['teamId'], ({database, teamId}: EnhanceProps) => {
    return {
        recentSearches: queryTeamSearchHistoryByTeamId(database, teamId).observe(),
        teamName: observeTeam(database, teamId).pipe(
            switchMap((t) => of$(t?.displayName || '')),
            distinctUntilChanged(),
        ),
        crossTeamSearchEnabled: observeConfigBooleanValue(database, 'EnableCrossTeamSearch'),
    };
});

export default compose(
    withDatabase,
    enhance,
)(Initial);

