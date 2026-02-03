// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {observeEnabledDevices} from '@e2ee/database/queries/devices';
import {DeviceList} from '@e2ee/screens/enabled_devices/device_list';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeCurrentUser} from '@queries/servers/user';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
    devices: observeEnabledDevices(database),
}));

export default withDatabase(enhanced(DeviceList));
