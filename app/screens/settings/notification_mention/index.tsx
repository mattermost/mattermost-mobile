// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';
import {WithDatabaseArgs} from '@typings/database/database';

import Mentions from './notification_mention';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        currentUser: observeCurrentUser(database),
    };
});

export default withDatabase(enhanced(Mentions));
