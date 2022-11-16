// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

import {observeChannel} from '@queries/servers/channel';

import AddPeopleBox from './add_people_box';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: Props) => {
    return {
        channel: observeChannel(database, channelId),
    };
});

export default withDatabase(enhanced(AddPeopleBox));
