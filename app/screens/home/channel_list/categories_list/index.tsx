// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeIsAgentsEnabled} from '@agents/database/queries/version';
import {Preferences} from '@constants';
import {getSidebarPreferenceAsBool} from '@helpers/api/preference';
import {observeHasRunningPlaybookRunsInTeam} from '@playbooks/database/queries/run';
import {observeIsPlaybooksEnabled} from '@playbooks/database/queries/version';
import {observeDraftCount} from '@queries/servers/drafts';
import {querySidebarPreferences} from '@queries/servers/preference';
import {observeScheduledPostEnabled, observeScheduledPostsForTeam} from '@queries/servers/scheduled_post';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeTeamLastChannelId} from '@queries/servers/team';
import {hasScheduledPostError} from '@utils/scheduled_post';

import CategoriesList from './categories_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const allScheduledPost = currentTeamId.pipe(switchMap((teamId) => observeScheduledPostsForTeam(database, teamId, true)));
    const showPlaybooksButton = currentTeamId.pipe(
        switchMap((teamId) => combineLatest([
            observeIsPlaybooksEnabled(database),
            observeHasRunningPlaybookRunsInTeam(database, teamId),
        ])),
        switchMap(([enabled, hasRunningRuns]) => of(enabled && hasRunningRuns)),
    );
    const unreadsOnTop = querySidebarPreferences(database, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS).
        observeWithColumns(['value']).
        pipe(
            switchMap((prefs: PreferenceModel[]) => of(getSidebarPreferenceAsBool(prefs, Preferences.CHANNEL_SIDEBAR_GROUP_UNREADS))),
        );

    return {
        lastChannelId: currentTeamId.pipe(switchMap((teamId) => observeTeamLastChannelId(database, teamId))),
        draftsCount: currentTeamId.pipe(switchMap((teamId) => observeDraftCount(database, teamId))),
        scheduledPostCount: allScheduledPost.pipe(switchMap((scheduledPosts) => of(scheduledPosts.length))),
        scheduledPostHasError: allScheduledPost.pipe(switchMap((scheduledPosts) => of(hasScheduledPostError(scheduledPosts)))),
        scheduledPostsEnabled: observeScheduledPostEnabled(database),
        agentsEnabled: observeIsAgentsEnabled(database),
        showPlaybooksButton,
        unreadsOnTop,
    };
});

export default withDatabase(enhanced(CategoriesList));
