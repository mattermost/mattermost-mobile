// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';
import {observeScheduledPostsForTeam} from '@queries/servers/scheduled_post';
import {observeCurrentTeamId} from '@queries/servers/system';

import GlobalScheduledPostList from './global_scheduled_post_list';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = {
    teamId: string;
} & WithDatabaseArgs;

const withTeamId = withObservables([], ({database}: WithDatabaseArgs) => ({
    teamId: observeCurrentTeamId(database),
}));

const enhanced = withObservables(['teamId'], ({database, teamId}: Props) => {
    const allScheduledPosts = observeScheduledPostsForTeam(database, teamId);
    const tutorialWatched = observeTutorialWatched(Tutorial.SCHEDULED_POSTS);

    return {
        allScheduledPosts,
        tutorialWatched,
    };
});

export default withDatabase(withTeamId(enhanced(GlobalScheduledPostList)));
