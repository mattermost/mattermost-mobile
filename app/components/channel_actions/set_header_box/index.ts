// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannelInfo} from '@queries/servers/channel';

import SetHeaderBox from './set_header';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs & {
    channelId: string;
}

const enhanced = withObservables(['channelId'], ({channelId, database}: OwnProps) => {
    const channelInfo = observeChannelInfo(database, channelId);
    const isHeaderSet = channelInfo.pipe(
        switchMap((c) => of$(Boolean(c?.header))),
    );

    return {
        isHeaderSet,
    };
});

export default withDatabase(enhanced(SetHeaderBox));
