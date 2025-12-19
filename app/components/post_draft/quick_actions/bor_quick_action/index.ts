// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeBoRConfig} from '@queries/servers/post';

import BoRAction from './bor_quick_action';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const borConfig = observeBoRConfig(database);
    return {
        borConfig,
    };
});

export default withDatabase(enhanced(BoRAction));
