// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeDraftCount} from '@queries/servers/drafts';
import {observeScheduledPostCount, observeScheduledPostEnabled} from '@queries/servers/scheduled_post';
import {observeCurrentTeamId} from '@queries/servers/system';

import GlobalDraftsAndScheduledPosts from './global_drafts';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const scheduledPostsEnabled = observeScheduledPostEnabled(database);
    const draftsCount = currentTeamId.pipe(switchMap((teamId) => observeDraftCount(database, teamId))); // Observe draft count
    const scheduledPostCount = combineLatest([currentTeamId, scheduledPostsEnabled]).pipe(
        switchMap(([teamId, isEnabled]) => {
            if (isEnabled) {
                return observeScheduledPostCount(database, teamId, true);
            }
            return of$(0);
        }),
    );
    return {
        scheduledPostsEnabled,
        draftsCount,
        scheduledPostCount,
    };
});

export default withDatabase(enhanced(GlobalDraftsAndScheduledPosts));
