// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {queryJoinedTeams} from '@queries/servers/team';

import TeamPickerIcon from './team_picker_icon';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const teams = queryJoinedTeams(database).observe();
    return {
        teams,
    };
});

export default withDatabase(enhanced(TeamPickerIcon));
