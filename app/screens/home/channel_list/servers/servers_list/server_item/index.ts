// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {catchError, switchMap} from 'rxjs/operators';

import {GLOBAL_IDENTIFIERS, MM_TABLES} from '@constants/database';
import {PUSH_PROXY_STATUS_UNKNOWN} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import {observePushVerificationStatus} from '@queries/servers/system';

import ServerItem from './server_item';

import type GlobalModel from '@typings/database/models/app/global';
import type ServersModel from '@typings/database/models/app/servers';

const {MULTI_SERVER_TUTORIAL} = GLOBAL_IDENTIFIERS;
const {APP: {GLOBAL}} = MM_TABLES;

const enhance = withObservables(['highlight'], ({highlight, server}: {highlight: boolean; server: ServersModel}) => {
    let tutorialWatched = of$(false);
    if (highlight) {
        tutorialWatched = server.collections.get<GlobalModel>(GLOBAL).findAndObserve(MULTI_SERVER_TUTORIAL).pipe(
            switchMap(({value}) => of$(Boolean(value))),
            catchError(() => of$(false)),
        );
    }

    const serverDatabase = DatabaseManager.serverDatabases[server.url]?.database;

    return {
        server: server.observe(),
        tutorialWatched,
        pushProxyStatus: serverDatabase ? observePushVerificationStatus(serverDatabase) : of$(PUSH_PROXY_STATUS_UNKNOWN),
    };
});

export default enhance(ServerItem);
