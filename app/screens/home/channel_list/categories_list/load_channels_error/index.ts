// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCurrentTeam} from '@queries/servers/team';

import LoadChannelsError from './load_channel_error';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const team = observeCurrentTeam(database);

    return {
        teamDisplayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
        ),
        teamId: team.pipe(
            switchMap((t) => of$(t?.id)),
        ),
    };
});

export default withDatabase(enhanced(LoadChannelsError));
