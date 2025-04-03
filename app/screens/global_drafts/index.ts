// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from 'rxjs/operators';

import {observeDraftCount} from '@queries/servers/drafts';
import {observeScheduledPostCount} from '@queries/servers/scheduled_post';
import {observeConfigBooleanValue, observeCurrentTeamId} from '@queries/servers/system';

import GlobalDraftsAndScheduledPosts from './global_drafts';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const scheduledPostsEnabled = observeConfigBooleanValue(database, 'ScheduledPosts');
    const draftsCount = currentTeamId.pipe(switchMap((teamId) => observeDraftCount(database, teamId))); // Observe draft count
    const scheduledPostCount = currentTeamId.pipe(switchMap((teamId) => observeScheduledPostCount(database, teamId, true)));
    return {
        scheduledPostsEnabled,
        draftsCount,
        scheduledPostCount,
    };
});

export default withDatabase(enhanced(GlobalDraftsAndScheduledPosts));
