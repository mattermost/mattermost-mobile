// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCurrentCall} from '@calls/state';
import {observePost} from '@queries/servers/post';

import Thread from './thread';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(['rootId'], ({database, rootId}: WithDatabaseArgs & {rootId: string}) => {
    const isInACall = observeCurrentCall().pipe(
        switchMap((call) => of$(Boolean(call?.connected))),
        distinctUntilChanged(),
    );

    return {
        rootPost: observePost(database, rootId),
        isInACall,
    };
});

export default withDatabase(enhanced(Thread));
