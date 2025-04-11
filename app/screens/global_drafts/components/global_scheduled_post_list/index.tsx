// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from 'rxjs/operators';

import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';
import {observeScheduledPostsForTeam} from '@queries/servers/scheduled_post';
import {observeCurrentTeamId} from '@queries/servers/system';

import GlobalScheduledPostList from './global_scheduled_post_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const teamIdObservable = observeCurrentTeamId(database);
    const allScheduledPosts = teamIdObservable.pipe(
        switchMap((teamId) => observeScheduledPostsForTeam(database, teamId, true)),
    );
    const tutorialWatched = observeTutorialWatched(Tutorial.SCHEDULED_POSTS_LIST);

    return {
        allScheduledPosts,
        tutorialWatched,
    };
});

export default withDatabase(enhanced(GlobalScheduledPostList));
