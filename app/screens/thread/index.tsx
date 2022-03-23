// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observePost} from '@queries/servers/post';

import Thread from './thread';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(['rootId'], ({database, rootId}: WithDatabaseArgs & {rootId: string}) => {
    return {
        rootPost: observePost(database, rootId),
    };
});

export default withDatabase(enhanced(Thread));
