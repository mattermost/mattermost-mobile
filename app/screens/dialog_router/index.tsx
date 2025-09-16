// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeConfigBooleanValue} from '@queries/servers/system';

import {DialogRouter} from './dialog_router';

import type {WithDatabaseArgs} from '@typings/database/database';

// Enhanced component with database observables for feature flag
const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const isAppsFormEnabled = observeConfigBooleanValue(database, 'FeatureFlagInteractiveDialogAppsForm');
    return {isAppsFormEnabled};
});

export default withDatabase(enhanced(DialogRouter));
