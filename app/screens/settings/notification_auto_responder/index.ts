// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeCurrentUser} from '@queries/servers/user';
import {WithDatabaseArgs} from '@typings/database/database';

import NotificationAutoResponder from './notification_auto_responder';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUser: observeCurrentUser(database),
    };
});

export default withDatabase(enhanced(NotificationAutoResponder));
