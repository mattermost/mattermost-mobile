// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeConfigBooleanValue, observeCurrentUserId} from '@queries/servers/system';

import UserItem from './user_item';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isCustomStatusEnabled = observeConfigBooleanValue(database, 'EnableCustomUserStatuses');
    const showFullName = observeConfigBooleanValue(database, 'ShowFullName');
    const currentUserId = observeCurrentUserId(database);
    return {
        isCustomStatusEnabled,
        showFullName,
        currentUserId,
    };
});

export default withDatabase(enhanced(UserItem));
