// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import AccountScreen from './account';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const showFullName = observeConfigBooleanValue(database, 'ShowFullName');
    const enableCustomUserStatuses = observeConfigBooleanValue(database, 'EnableCustomUserStatuses');

    return {
        currentUser: observeCurrentUser(database),
        enableCustomUserStatuses,
        showFullName,
    };
});

export default withDatabase(enhanced(AccountScreen));
