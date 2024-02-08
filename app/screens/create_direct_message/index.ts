// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General, Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';
import {observeConfigValue, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import CreateDirectMessage from './create_direct_message';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const restrictDirectMessage = observeConfigValue(database, 'RestrictDirectMessage').pipe(
        switchMap((v) => of$(v !== General.RESTRICT_DIRECT_MESSAGE_ANY)),
    );

    return {
        teammateNameDisplay: observeTeammateNameDisplay(database),
        currentUserId: observeCurrentUserId(database),
        currentTeamId: observeCurrentTeamId(database),
        tutorialWatched: observeTutorialWatched(Tutorial.PROFILE_LONG_PRESS),
        restrictDirectMessage,
    };
});

export default withDatabase(enhanced(CreateDirectMessage));

