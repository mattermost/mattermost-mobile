// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeCurrentTeamId} from '@queries/servers/system';

import MarkAsUnreadOption from './mark_unread_option';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        teamId: observeCurrentTeamId(database),
    };
});

export default withDatabase(enhanced(MarkAsUnreadOption));
