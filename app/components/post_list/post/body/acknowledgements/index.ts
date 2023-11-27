// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import compose from 'lodash/fp/compose';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeCurrentUser} from '@queries/servers/user';

import Acknowledgements from './acknowledgements';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], (ownProps: WithDatabaseArgs) => {
    const database = ownProps.database;
    const currentUser = observeCurrentUser(database);

    return {
        currentUserId: currentUser.pipe(switchMap((c) => of$(c?.id))),
        currentUserTimezone: currentUser.pipe(switchMap((c) => of$(c?.timezone))),
    };
});

export default compose(
    withDatabase,
    enhanced,
)(Acknowledgements);
