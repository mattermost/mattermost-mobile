// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeProfileLongPresTutorial} from '@queries/app/global';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import MembersModal from './members_modal';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        teammateNameDisplay: observeTeammateNameDisplay(database),
        currentUserId: observeCurrentUserId(database),
        tutorialWatched: observeProfileLongPresTutorial(),
    };
});

export default withDatabase(enhanced(MembersModal));
