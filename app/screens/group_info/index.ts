// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import {withObservables} from '@nozbe/watermelondb/react';

import {Tutorial} from '@constants';
import {observeTutorialWatched} from '@queries/app/global';
import {observeGroup} from '@queries/servers/group';
import {observeCurrentUserId} from '@queries/servers/system';

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
        tutorialWatched: observeTutorialWatched(Tutorial.PROFILE_LONG_PRESS),
    };
});

export default withDatabase(enhanced(GroupInfo));
