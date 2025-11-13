// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {map} from 'rxjs/operators';

import EphemeralStore from '@store/ephemeral_store';

export const observeIsAIEnabled = (serverUrl: string) => {
    return EphemeralStore.observeAIAgents(serverUrl).pipe(
        map((agents) => agents.length > 0),
    );
};

