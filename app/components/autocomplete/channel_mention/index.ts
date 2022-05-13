// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryAllChannelsForTeam, queryAllMyChannel} from '@queries/servers/channel';
import {observeCurrentTeamId} from '@queries/servers/system';

import ChannelMention from './channel_mention';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        myMembers: queryAllMyChannel(database).observe(),
        localChannels: observeCurrentTeamId(database).pipe(switchMap((id) => (id ? queryAllChannelsForTeam(database, id).observe() : of$([])))),
    };
});

export default withDatabase(enhanced(ChannelMention));
