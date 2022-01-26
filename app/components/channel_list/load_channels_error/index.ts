// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';

const {SERVER: {TEAM}} = MM_TABLES;
import LoadChannelsError from './load_channel_error';

import type {WithDatabaseArgs} from '@typings/database/database';
import type TeamModel from '@typings/database/models/servers/team';

const enhanced = withObservables(['teamId'], ({database, teamId}: {teamId: string} & WithDatabaseArgs) => {
    const team = database.get<TeamModel>(TEAM).findAndObserve(teamId);

    return {
        teamDisplayName: team.pipe(
            switchMap((t) => of$(t.displayName)),
        ),
    };
});

export default withDatabase(enhanced(LoadChannelsError));
