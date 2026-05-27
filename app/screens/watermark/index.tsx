// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {withServerDatabase} from '@database/components';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';

import WatermarkScreen from './watermark';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    enabled: observeConfigBooleanValue(database, 'ExperimentalEnableWatermark'),
    currentUser: observeCurrentUser(database),
}));

export default withServerDatabase(withDatabase(enhanced(WatermarkScreen)));
