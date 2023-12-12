// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import {withObservables} from '@nozbe/watermelondb/react';

import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';
import {observeGroup} from '@queries/servers/group';
import {observeConfigBooleanValue, observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import GroupInfo from './group_info';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhancedProps = WithDatabaseArgs & {
    groupName: string;
}

const enhanced = withObservables([], ({database, groupName}: EnhancedProps) => {
    const currentUserId = observeCurrentUserId(database);
    const group = observeGroup(database, groupName);

    return {
        currentUserId,
        group,
        teammateNameNameDisplay: observeTeammateNameDisplay(database),
        tutorialWatched: observeTutorialWatched(Tutorial.PROFILE_LONG_PRESS),
        hideGuestTags: observeConfigBooleanValue(database, 'HideGuestTags'),
    };
});

export default withDatabase(enhanced(GroupInfo));
