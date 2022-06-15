// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeProfileLongPresTutorial} from '@queries/app/global';
import {observeConfig, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import CreateDirectMessage from './create_direct_message';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const restrictDirectMessage = observeConfig(database).pipe(
        switchMap((cfg) => of$(cfg?.RestrictDirectMessage !== General.RESTRICT_DIRECT_MESSAGE_ANY)),
    );

    return {
        teammateNameDisplay: observeTeammateNameDisplay(database),
        currentUserId: observeCurrentUserId(database),
        currentTeamId: observeCurrentTeamId(database),
        tutorialWatched: observeProfileLongPresTutorial(),
        restrictDirectMessage,
    };
});

export default withDatabase(enhanced(CreateDirectMessage));

