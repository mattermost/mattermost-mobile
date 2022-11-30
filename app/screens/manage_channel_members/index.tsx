// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {observeProfileLongPresTutorial} from '@app/queries/app/global';
import {observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeCurrentUser, observeTeammateNameDisplay} from '@queries/servers/user';
import {isSystemAdmin, isChannelAdmin} from '@utils/user';

import ManageChannelMembers from './manage_channel_members';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUserId: observeCurrentUserId(database),
        currentTeamId: observeCurrentTeamId(database),
        canManage: observeCurrentUser(database).pipe(
            map((user) => isSystemAdmin(user?.roles || '') || isChannelAdmin(user?.roles || '')),
            distinctUntilChanged(),
        ),
        teammateNameDisplay: observeTeammateNameDisplay(database),
        tutorialWatched: observeProfileLongPresTutorial(),
    };
});

export default withDatabase(enhanced(ManageChannelMembers));
