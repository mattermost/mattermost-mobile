// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import WebSocket from './websocket';

import type {WithDatabaseArgs} from '@typings/database/database';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    isConnected: database.get<SystemModel>(SYSTEM).
        findAndObserve(SYSTEM_IDENTIFIERS.WEBSOCKET).
        pipe(
            switchMap(({value}) => of$(parseInt(value || 0, 10) > 0)),
        ),
}));

export default enhanced(WebSocket);
