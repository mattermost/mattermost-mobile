// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeIfHighlightWithoutNotificationHasLicense} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import Message from './message';

import type {WithDatabaseArgs} from '@typings/database/database';

const withMessageInput = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);
    const isHighlightWithoutNotificationLicensed = observeIfHighlightWithoutNotificationHasLicense(database);
    return {
        currentUser,
        isHighlightWithoutNotificationLicensed,
    };
});

export default withDatabase(withMessageInput(Message));
