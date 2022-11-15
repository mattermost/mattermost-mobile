// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {General} from '@constants';
import {observeProfileLongPresTutorial} from '@queries/app/global';
import {observeConfigValue, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import ManageChannelMembers from './manage_channel_members';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const restrictDirectMessage = observeConfigValue(database, 'RestrictDirectMessage').pipe(
        switchMap((v) => of$(v !== General.RESTRICT_DIRECT_MESSAGE_ANY)),
    );

    return {
        teammateNameDisplay: observeTeammateNameDisplay(database),
        currentUserId: observeCurrentUserId(database),
        currentTeamId: observeCurrentTeamId(database),
        tutorialWatched: observeProfileLongPresTutorial(),
        restrictDirectMessage,
    };
});

export default withDatabase(enhanced(ManageChannelMembers));
