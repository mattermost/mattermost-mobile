// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {map, switchMap} from 'rxjs/operators';

import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeScheduledPostCountForChannel, observeScheduledPostCountForDMsAndGMs} from '@queries/servers/scheduled_post';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import {ScheduledPostIndicator} from './scheduled_post_indicator';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
    channelType: ChannelType;
}

const enhance = withObservables(['channelId', 'channelType'], ({database, channelId, channelType}: Props) => {
    const currentUser = observeCurrentUser(database);
    const currentTeamId = observeCurrentTeamId(database);
    const preferences = queryDisplayNamePreferences(database).
        observeWithColumns(['value']);
    const isMilitaryTime = preferences.pipe(map((prefs) => getDisplayNamePreferenceAsBool(prefs, 'use_military_time')));

    let scheduledPostCount;
    if (channelType === 'D' || channelType === 'G') {
        scheduledPostCount = observeScheduledPostCountForDMsAndGMs(database, channelId);
    } else {
        scheduledPostCount = currentTeamId.pipe(switchMap((teamId) => observeScheduledPostCountForChannel(database, teamId, channelId)));
    }
    return {
        currentUser,
        isMilitaryTime,
        scheduledPostCount,
    };
});

export default withDatabase(enhance(ScheduledPostIndicator));
