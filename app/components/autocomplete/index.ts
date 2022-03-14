// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeConfigBooleanValue} from '@queries/servers/system';

import Autocomplete from './autocomplete';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    isAppsEnabled: observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled'),
}));

export default withDatabase(enhanced(Autocomplete));
