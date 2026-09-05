// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';

import type {SelectableAgent} from '@agents/types';

const isEligible = (agents: Array<{id: string}>, selected: SelectableAgent | null) => (
    selected !== null && agents.some((agent) => agent.id === selected.id)
);

/**
 * Own an entry-point sheet's agent selection. Until the user explicitly picks
 * an agent in this sheet session, the selection keeps following the
 * auto-resolved agent (saved pref -> default -> first) as the bot list and
 * preferences refresh. An explicit pick sticks — unless that agent disappears
 * from the eligible list, in which case auto-resolution takes over again.
 */
export function useAgentSelection(
    eligibleAgents: Array<{id: string}>,
    autoResolvedAgent: SelectableAgent | null,
): {selectedAgent: SelectableAgent | null; selectAgent: (agent: SelectableAgent) => void} {
    const [selectedAgent, setSelectedAgent] = useState<SelectableAgent | null>(autoResolvedAgent);
    const userSelectedRef = useRef(false);

    const selectAgent = useCallback((agent: SelectableAgent) => {
        userSelectedRef.current = true;
        setSelectedAgent(agent);
    }, []);

    useEffect(() => {
        setSelectedAgent((current) => {
            if (userSelectedRef.current && isEligible(eligibleAgents, current)) {
                return current;
            }

            // Either the user hasn't picked in this sheet session (keep
            // following auto-resolution) or their pick vanished from the
            // eligible list (reset so auto-resolution owns the selection).
            userSelectedRef.current = false;
            return autoResolvedAgent;
        });
    }, [eligibleAgents, autoResolvedAgent]);

    return {selectedAgent, selectAgent};
}
