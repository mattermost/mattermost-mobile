// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';

import {observeMultiServerTutorial} from '@app/queries/app/global';

import ServerItem from './server_item';

import type ServersModel from '@typings/database/models/app/servers';

const enhance = withObservables(['highlight'], ({highlight, server}: {highlight: boolean; server: ServersModel}) => {
    let tutorialWatched = of$(false);
    if (highlight) {
        tutorialWatched = observeMultiServerTutorial(server.database);
    }

    return {
        server: server.observe(),
        tutorialWatched,
    };
});

export default enhance(ServerItem);
