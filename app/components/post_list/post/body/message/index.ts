// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeCurrentUser} from '@queries/servers/user';

import Message from './message';

import type {WithDatabaseArgs} from '@typings/database/database';

const withMessageInput = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);
    return {
        currentUser,
    };
});

export default withDatabase(withMessageInput(Message));
