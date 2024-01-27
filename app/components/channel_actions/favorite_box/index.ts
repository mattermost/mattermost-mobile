// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatestWith, switchMap} from 'rxjs/operators';

import {observeIsChannelFavorited} from '@queries/servers/categories';
import {observeChannel} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';

import FavoriteBox from './favorite_box';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    const currentTeamId = observeCurrentTeamId(database);
    const channel = observeChannel(database, channelId);
    const isFavorited = channel.pipe(
        combineLatestWith(currentTeamId),
        switchMap(([c, tId]) => observeIsChannelFavorited(database, c?.teamId || tId, channelId)),
    );

    return {
        isFavorited,
    };
});

export default withDatabase(enhanced(FavoriteBox));
