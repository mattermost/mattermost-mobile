// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {rewriteStore, type RewriteState} from '@agents/store';
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

/**
 * React hook to subscribe to rewrite state
 */
export function useRewriteState(): RewriteState {
    const [state, setState] = useState<RewriteState>(
        () => rewriteStore.getRewriteState(),
    );

    useEffect(() => {
        const subscription = rewriteStore.observeRewriteState().subscribe(setState);
        return () => subscription.unsubscribe();
    }, []);

    return state;
}
