// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of, startWith} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeIsAgentsEnabled} from '@agents/database/queries/version';
import {observeHasRunningPlaybookRunsInTeam} from '@playbooks/database/queries/run';
import {observeIsPlaybooksEnabled} from '@playbooks/database/queries/version';
import {observeDraftCount} from '@queries/servers/drafts';
import {observeScheduledPostEnabled, observeScheduledPostsForTeam} from '@queries/servers/scheduled_post';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeTeamLastChannelId} from '@queries/servers/team';
import {hasScheduledPostError} from '@utils/scheduled_post';

import CategoriesList from './categories_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enchanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const draftsCount = currentTeamId.pipe(
        switchMap((teamId) => observeDraftCount(database, teamId)),
        startWith(0),
    );
    const allScheduledPost = currentTeamId.pipe(switchMap((teamId) => observeScheduledPostsForTeam(database, teamId, true)));
    const lastChannelId = currentTeamId.pipe(
        switchMap((teamId) => observeTeamLastChannelId(database, teamId)),
        startWith(undefined),
    );
    const scheduledPostCount = allScheduledPost.pipe(
        switchMap((scheduledPosts) => of(scheduledPosts.length)),
        startWith(0),
    );
    const scheduledPostHasError = allScheduledPost.pipe(
        switchMap((scheduledPosts) => of(hasScheduledPostError(scheduledPosts))),
        startWith(false),
    );
    const scheduledPostsEnabled = observeScheduledPostEnabled(database).pipe(startWith(false));
    const agentsEnabled = observeIsAgentsEnabled(database).pipe(startWith(false));
    const showPlaybooksButton = currentTeamId.pipe(
        switchMap((teamId) => combineLatest([
            observeIsPlaybooksEnabled(database),
            observeHasRunningPlaybookRunsInTeam(database, teamId),
        ])),
        switchMap(([enabled, hasRunningRuns]) => of(enabled && hasRunningRuns)),
        startWith(false),
    );

    return {
        lastChannelId,
        draftsCount,
        scheduledPostCount,
        scheduledPostHasError,
        scheduledPostsEnabled,
        agentsEnabled,
        showPlaybooksButton,
    };
});

export default withDatabase(enchanced(CategoriesList));
