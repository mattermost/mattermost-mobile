// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {observeChannel, queryMyRecentChannels} from '@queries/servers/channel';
import {observeCanShareToDmGm} from '@queries/servers/dm_gm_access';
import {observeCurrentChannelId, observeCurrentUserId} from '@queries/servers/system';
import {isDMorGM} from '@utils/channel';

import ContentView from './content_view';

import type {Database} from '@nozbe/watermelondb';
import type {WithDatabaseArgs} from '@typings/database/database';

const observeMostRecentChannelId = (database: Database) => {
    return queryMyRecentChannels(database, 1, true).observe().pipe(
        map((myChannels) => myChannels[0]?.id ?? ''),
    );
};

// A conversation the share cannot be posted to is not preselected; the most recent channel is instead.
const observePreselectedChannelId = (database: Database) => {
    return combineLatest([observeCurrentChannelId(database), observeCanShareToDmGm(database)]).pipe(
        switchMap(([channelId, canShare]) => (canShare ? of$(channelId) : observeChannel(database, channelId).pipe(
            switchMap((c) => (c && isDMorGM(c) ? observeMostRecentChannelId(database) : of$(channelId))),
        ))),
        distinctUntilChanged(),
    );
};

const enhanced = withObservables(['database'], ({database}: WithDatabaseArgs) => ({
    currentUserId: observeCurrentUserId(database),
    currentChannelId: observePreselectedChannelId(database),
}));

export default enhanced(ContentView);

