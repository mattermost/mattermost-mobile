// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';

import {useAgentSelection} from './use_agent_selection';

import type {SelectableAgent} from '@agents/types';

const agentA: SelectableAgent = {id: 'a', displayName: 'Agent A', username: 'agent-a'};
const agentB: SelectableAgent = {id: 'b', displayName: 'Agent B', username: 'agent-b'};
const agentC: SelectableAgent = {id: 'c', displayName: 'Agent C', username: 'agent-c'};

type HookProps = {
    agents: SelectableAgent[];
    auto: SelectableAgent | null;
};

const render = (initialProps: HookProps) => renderHook(
    ({agents, auto}: HookProps) => useAgentSelection(agents, auto),
    {initialProps},
);

describe('useAgentSelection', () => {
    it('should follow the auto-resolved agent until the user picks one', () => {
        const {result, rerender} = render({agents: [agentA], auto: agentA});

        expect(result.current.selectedAgent).toBe(agentA);

        // Saved pref/default arrives late: the selection follows it.
        rerender({agents: [agentA, agentB], auto: agentB});

        expect(result.current.selectedAgent).toBe(agentB);
    });

    it('should keep an explicit user pick while it remains eligible', () => {
        const {result, rerender} = render({agents: [agentA, agentB], auto: agentA});

        act(() => {
            result.current.selectAgent(agentB);
        });
        rerender({agents: [agentA, agentB, agentC], auto: agentA});

        expect(result.current.selectedAgent).toBe(agentB);
    });

    it('should reset to auto-resolution when the picked agent leaves the eligible list', () => {
        const {result, rerender} = render({agents: [agentA, agentB], auto: agentA});

        act(() => {
            result.current.selectAgent(agentB);
        });
        rerender({agents: [agentA], auto: agentA});

        expect(result.current.selectedAgent).toBe(agentA);

        // The reset also re-arms auto-resolution for subsequent updates.
        rerender({agents: [agentA, agentC], auto: agentC});

        expect(result.current.selectedAgent).toBe(agentC);
    });
});
