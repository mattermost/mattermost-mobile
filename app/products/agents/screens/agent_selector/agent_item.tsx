// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import OptionItem from '@components/option_item';

import type {SelectableAgent} from '@agents/types';

type Props = {
    agent: SelectableAgent;
    selectedAgentId: string;
    onSelect: (agent: SelectableAgent) => void;
};

const AgentItem = ({agent, selectedAgentId, onSelect}: Props) => {
    const handleSelect = useCallback(() => {
        onSelect(agent);
    }, [agent, onSelect]);

    return (
        <OptionItem
            label={agent.displayName}
            description={`@${agent.username}`}
            action={handleSelect}
            type='radio'
            selected={agent.id === selectedAgentId}
            testID={`ai_agent_selector.agent.${agent.id}`}
            descriptionNumberOfLines={1}
        />
    );
};

export default AgentItem;
