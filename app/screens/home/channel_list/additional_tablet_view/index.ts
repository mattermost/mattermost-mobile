// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeCurrentChannelId} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import AdditionalTabletView from './additional_tablet_view';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentChannelId: observeCurrentChannelId(database),
    isCRTEnabled: observeIsCRTEnabled(database),
}));

export default withDatabase(enhanced(AdditionalTabletView));
