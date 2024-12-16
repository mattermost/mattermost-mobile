// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable max-nested-callbacks */

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from 'rxjs/operators';

import {observeDraftCount} from '@queries/servers/drafts';
import {observeCurrentChannelId, observeCurrentTeamId} from '@queries/servers/system';

import DraftsButton from './drafts_button';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database); // Observe teamId
    const draftsCount = currentTeamId.pipe(switchMap((teamId) => observeDraftCount(database, teamId))); // Observe draft count
    return {
        currentChannelId: observeCurrentChannelId(database),
        draftsCount,
    };
});

export default withDatabase(enhanced(DraftsButton));

