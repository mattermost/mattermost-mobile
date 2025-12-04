// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigBooleanValue} from '@queries/servers/system';

import AdvancedSettings from './advanced';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        isDevMode: observeConfigBooleanValue(database, 'EnableDeveloper', false),
    };
});

export default withDatabase(enhanced(AdvancedSettings));
