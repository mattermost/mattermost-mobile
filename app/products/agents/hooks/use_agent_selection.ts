// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';

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
    const [userPick, setUserPick] = useState<SelectableAgent | null>(null);
    const pickIsEligible = isEligible(eligibleAgents, userPick);

    // Drop a pick that left the eligible list for good, so it doesn't come
    // back if the agent later reappears.
    useEffect(() => {
        if (userPick && !pickIsEligible) {
            setUserPick(null);
        }
    }, [userPick, pickIsEligible]);

    return {
        selectedAgent: pickIsEligible ? userPick : autoResolvedAgent,
        selectAgent: setUserPick,
    };
}
