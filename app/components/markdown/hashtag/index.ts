// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel} from '@queries/servers/channel';

import Hashtag from './hashtag';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId?: string;
}

const enhance = withObservables(['channelId'], ({channelId, database}: Props) => {
    let inChannel = of$('');
    if (channelId) {
        inChannel = observeChannel(database, channelId).pipe(
            switchMap((c) => of$(c?.name || '')),
        );
    }

    return {
        inChannel,
    };
});

export default withDatabase(enhance(Hashtag));
