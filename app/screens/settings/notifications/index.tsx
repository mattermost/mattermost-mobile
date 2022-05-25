// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {WithDatabaseArgs} from '@typings/database/database';

import NotificationSettings from './notifications';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        enableAutoResponder: observeConfigBooleanValue(database, 'ExperimentalEnableAutomaticReplies'),
    };
});

export default withDatabase(enhanced(NotificationSettings));
