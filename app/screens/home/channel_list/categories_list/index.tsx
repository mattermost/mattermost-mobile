// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeDraftCount} from '@queries/servers/drafts';
import {observeScheduledPostCount, observeScheduledPostsForTeam} from '@queries/servers/scheduled_post';
import {observeCurrentTeamId} from '@queries/servers/system';

import CategoriesList from './categories_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enchanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const draftsCount = currentTeamId.pipe(switchMap((teamId) => observeDraftCount(database, teamId))); // Observe draft count
    const scheduledPostCount = currentTeamId.pipe(switchMap((teamId) => observeScheduledPostCount(database, teamId, true))); // Observe scheduled post count
    const allScheduledPost = currentTeamId.pipe(switchMap((teamId) => observeScheduledPostsForTeam(database, teamId, true))); // Observe scheduled post count

    const scheduledPostHasError = allScheduledPost.pipe(
        // eslint-disable-next-line max-nested-callbacks
        switchMap((scheduledPosts) => of(scheduledPosts.some((post) => post.errorCode !== ''))),
    );

    return {
        draftsCount,
        scheduledPostCount,
        scheduledPostHasError,
    };
});

export default withDatabase(enchanced(CategoriesList));
