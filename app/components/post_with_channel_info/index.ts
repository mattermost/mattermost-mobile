// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeIsCRTEnabled} from '@queries/servers/thread';

import PostWithChannelInfo from './post_with_channel_info';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        isCRTEnabled: observeIsCRTEnabled(database),
    };
});

export default withDatabase(enhance(PostWithChannelInfo));
