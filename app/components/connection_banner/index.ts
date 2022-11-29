// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeWebsocket} from '@queries/servers/system';

import ConnectionBanner from './connection_banner';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    isDisconnected: observeWebsocket(database).pipe(
        switchMap((value) => of$(value > 0)),
    ),
}));

export default withDatabase(enhanced(ConnectionBanner));
