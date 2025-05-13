// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeDraftCount} from '@queries/servers/drafts';
import {observeScheduledPostEnabled, observeScheduledPostsForTeam} from '@queries/servers/scheduled_post';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeTeamLastChannelId} from '@queries/servers/team';
import {hasScheduledPostError} from '@utils/scheduled_post';

import CategoriesList from './categories_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enchanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const draftsCount = currentTeamId.pipe(switchMap((teamId) => observeDraftCount(database, teamId))); // Observe draft count
    const allScheduledPost = currentTeamId.pipe(switchMap((teamId) => observeScheduledPostsForTeam(database, teamId, true)));
    const lastChannelId = currentTeamId.pipe(switchMap((teamId) => observeTeamLastChannelId(database, teamId)));
    const scheduledPostCount = allScheduledPost.pipe(
        switchMap((scheduledPosts) => of(scheduledPosts.length)),
    );
    const scheduledPostHasError = allScheduledPost.pipe(
        switchMap((scheduledPosts) => of(hasScheduledPostError(scheduledPosts))),
    );
    const scheduledPostsEnabled = observeScheduledPostEnabled(database);

    return {
        lastChannelId,
        draftsCount,
        scheduledPostCount,
        scheduledPostHasError,
        scheduledPostsEnabled,
    };
});

export default withDatabase(enchanced(CategoriesList));
