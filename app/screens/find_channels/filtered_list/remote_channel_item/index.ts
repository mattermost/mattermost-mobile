// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeTeam} from '@queries/servers/team';

import RemoteChannelItem from './remote_channel_item';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    channel: Channel;
    showTeamName?: boolean;
}

const enhance = withObservables(['channel', 'showTeamName'], ({channel, database, showTeamName}: EnhanceProps) => {
    let teamDisplayName = of$('');
    if (channel.team_id && showTeamName) {
        teamDisplayName = observeTeam(database, channel.team_id).pipe(
            switchMap((team) => of$(team?.displayName || '')),
        );
    }

    return {
        teamDisplayName,
    };
});

export default React.memo(withDatabase(enhance(RemoteChannelItem)));
