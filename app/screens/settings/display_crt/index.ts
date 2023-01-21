// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeCurrentUserId} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import DisplayCRT from './display_crt';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUserId: observeCurrentUserId(database),
        isCRTEnabled: observeIsCRTEnabled(database),
    };
});

export default withDatabase(enhanced(DisplayCRT));
