// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeTeam} from '@queries/servers/team';

import LoadChannelsError from './load_channel_error';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(['teamId'], ({database, teamId}: {teamId: string} & WithDatabaseArgs) => {
    const team = observeTeam(database, teamId);

    return {
        teamDisplayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
        ),
    };
});

export default withDatabase(enhanced(LoadChannelsError));
