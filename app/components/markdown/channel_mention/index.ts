// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from 'rxjs/operators';

import {queryAllChannelsForTeam} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeTeam} from '@queries/servers/team';

import ChannelMention from './channel_mention';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentTeamId = observeCurrentTeamId(database);
    const channels = currentTeamId.pipe(
        switchMap((id) => queryAllChannelsForTeam(database, id).observeWithColumns(['display_name'])),
    );
    const team = currentTeamId.pipe(
        switchMap((id) => observeTeam(database, id)),
    );

    return {
        channels,
        currentTeamId,
        team,
    };
});

export default withDatabase(enhance(ChannelMention));
