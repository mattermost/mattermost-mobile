// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {rewriteStore} from '@agents/store';
import {map} from 'rxjs/operators';

export const observeIsAIEnabled = (serverUrl: string) => {
    return rewriteStore.observeAgents(serverUrl).pipe(
        map((agents) => agents.length > 0),
    );
};

