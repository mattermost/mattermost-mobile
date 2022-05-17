// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';

import {PUSH_PROXY_STATUS_UNKNOWN} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import {observeMultiServerTutorial} from '@queries/app/global';
import {observePushVerificationStatus} from '@queries/servers/system';

import ServerItem from './server_item';

import type ServersModel from '@typings/database/models/app/servers';

const enhance = withObservables(['highlight'], ({highlight, server}: {highlight: boolean; server: ServersModel}) => {
    let tutorialWatched = of$(false);
    if (highlight) {
        tutorialWatched = observeMultiServerTutorial(server.database);
    }

    const serverDatabase = DatabaseManager.serverDatabases[server.url]?.database;

    return {
        server: server.observe(),
        tutorialWatched,
        pushProxyStatus: serverDatabase ? observePushVerificationStatus(serverDatabase) : of$(PUSH_PROXY_STATUS_UNKNOWN),
    };
});

export default enhance(ServerItem);
