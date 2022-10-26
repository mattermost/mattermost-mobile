// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeTeammateNameDisplay} from '@queries/servers/user';

import CreateDirectMessage from './create_direct_message';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        teammateNameDisplay: observeTeammateNameDisplay(database),
    };
});

export default withDatabase(enhanced(CreateDirectMessage));

