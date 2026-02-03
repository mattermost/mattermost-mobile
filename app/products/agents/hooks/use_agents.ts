// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {rewriteStore} from '@agents/store';
import {useEffect, useState} from 'react';

import type {Agent} from '@agents/types';

/**
 * React hook to subscribe to agents for a server
 */
export function useAgents(serverUrl: string): Agent[] {
    const [agents, setAgents] = useState<Agent[]>(
        () => rewriteStore.getAgents(serverUrl),
    );

    useEffect(() => {
        const subscription = rewriteStore.observeAgents(serverUrl).subscribe(setAgents);
        return () => subscription.unsubscribe();
    }, [serverUrl]);

    return agents;
}
