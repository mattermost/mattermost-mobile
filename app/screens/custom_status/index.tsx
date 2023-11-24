// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeIsCustomStatusExpirySupported, observeRecentCustomStatus} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import CustomStatus from './custom_status';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhancedCSM = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUser: observeCurrentUser(database),
        recentCustomStatuses: observeRecentCustomStatus(database),
        customStatusExpirySupported: observeIsCustomStatusExpirySupported(database),
    };
});

export default withDatabase(enhancedCSM(CustomStatus));
