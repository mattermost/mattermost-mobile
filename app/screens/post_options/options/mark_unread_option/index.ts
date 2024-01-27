// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeCurrentTeamId} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import MarkAsUnreadOption from './mark_unread_option';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        teamId: observeCurrentTeamId(database),
        isCRTEnabled: observeIsCRTEnabled(database),
    };
});

export default withDatabase(enhanced(MarkAsUnreadOption));
