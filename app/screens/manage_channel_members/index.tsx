// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeProfileLongPresTutorial} from '@app/queries/app/global';
import {observeCurrentTeamId} from '@queries/servers/system';
import {observeCurrentUser, observeTeammateNameDisplay} from '@queries/servers/user';

import ManageChannelMembers from './manage_channel_members';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUser: observeCurrentUser(database),
        currentTeamId: observeCurrentTeamId(database),
        teammateNameDisplay: observeTeammateNameDisplay(database),
        tutorialWatched: observeProfileLongPresTutorial(),
    };
});

export default withDatabase(enhanced(ManageChannelMembers));
