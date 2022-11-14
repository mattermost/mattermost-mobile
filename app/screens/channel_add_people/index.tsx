// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeCurrentTeamId} from '@app/queries/servers/system';
import {observeCurrentChannel} from '@queries/servers/channel';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import ChannelAddPeople from './channel_add_people';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentChannel: observeCurrentChannel(database),
        currentTeamId: observeCurrentTeamId(database),
        teammateNameDisplay: observeTeammateNameDisplay(database),
    };
});

export default withDatabase(enhanced(ChannelAddPeople));

