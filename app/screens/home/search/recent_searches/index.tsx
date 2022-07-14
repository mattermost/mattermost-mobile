// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';

import {queryTeamSearchHistoryByTeamId} from '@queries/servers/team';

import RecentSearches from './recent_searches';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    teamId: string;
}

const enhance = withObservables(['teamId'], ({database, teamId}: EnhanceProps) => {
    return {
        recentSearches: queryTeamSearchHistoryByTeamId(database, teamId).observe(),
    };
});

export default compose(
    withDatabase,
    enhance,
)(RecentSearches);
