// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {map} from 'rxjs/operators';

import {rewriteStore} from '@agents/store';

export const observeIsAgentsEnabled = (serverUrl: string) => {
    return rewriteStore.observeAgents(serverUrl).pipe(
        map((agents) => agents.length > 0),
    );
};
