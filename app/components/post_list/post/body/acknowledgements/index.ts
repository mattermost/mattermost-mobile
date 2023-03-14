// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';

import {observeCurrentUser} from '@queries/servers/user';

import Acknowledgements from './acknowledgements';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], (ownProps: WithDatabaseArgs) => {
    const database = ownProps.database;
    const currentUser = observeCurrentUser(database);

    return {
        currentUser,
    };
});

export default compose(
    withDatabase,
    enhanced,
)(Acknowledgements);
