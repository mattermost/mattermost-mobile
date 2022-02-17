// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {WithDatabaseArgs} from '@typings/database/database';
import SystemModel from '@typings/database/models/servers/system';

import SaveOption from './save_option';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUserId = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID);

    return {
        currentUserId,
    };
});

export default withDatabase(enhanced(SaveOption));
