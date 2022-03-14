// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {queryAllMyChannel} from '@queries/servers/channel';

import ChannelMention from './channel_mention';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        myMembers: queryAllMyChannel(database).observe(),
    };
});

export default withDatabase(enhanced(ChannelMention));
