// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';
import {observeDraftsForTeam, observeScheduledPostsForTeam} from '@queries/servers/drafts';
import {observeCurrentTeamId} from '@queries/servers/system';

import GlobalDraftsList from './global_drafts_list';

import type {WithDatabaseArgs} from '@typings/database/database';

const withTeamId = withObservables([], ({database}: WithDatabaseArgs) => ({
    teamId: observeCurrentTeamId(database),
}));

type Props = {
    teamId: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['teamId'], ({database, teamId}: Props) => {
    const allDrafts = observeDraftsForTeam(database, teamId);
    const tutorialWatched = observeTutorialWatched(Tutorial.DRAFTS);

    const allScheduledPosts = observeScheduledPostsForTeam(database, teamId, true);

    return {
        allDrafts,
        tutorialWatched,
        allScheduledPosts,
    };
});

export default withDatabase(withTeamId(enhanced(GlobalDraftsList)));
