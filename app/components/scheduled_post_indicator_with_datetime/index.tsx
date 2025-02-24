// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from 'rxjs/operators';

import {observeScheduledPostsForTeam} from '@queries/servers/scheduled_post';
import {observeCurrentTeamId} from '@queries/servers/system';

import ScheduledPostIndicatorWithDatetime from './scheduled_post_indicator_with_datetime';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enchanced = withObservables(['channelId'], ({database}: Props) => {
    const currentTeamId = observeCurrentTeamId(database);
    const scheduledPosts = currentTeamId.pipe(switchMap((teamId) => observeScheduledPostsForTeam(database, teamId, true)));

    return {
        scheduledPosts,
    };
});

export default withDatabase(enchanced(ScheduledPostIndicatorWithDatetime));
