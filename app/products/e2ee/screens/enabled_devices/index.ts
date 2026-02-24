// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceList} from '@e2ee/screens/enabled_devices/device_list';
import withDatabase from '@nozbe/watermelondb/react/withDatabase';
import withObservables from '@nozbe/watermelondb/react/withObservables';

import {observeCurrentUser} from '@queries/servers/user';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
}));

export default withDatabase(enhanced(DeviceList));
