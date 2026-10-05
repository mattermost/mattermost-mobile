// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useMemo} from 'react';

import {fetchAIBots} from '@agents/actions/remote/bots';
import {saveSelectedAgent} from '@agents/actions/remote/preference';
import {filterAgentsForChannel, resolveSelectedAgent} from '@agents/utils';
import {useServerUrl} from '@context/server';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {useAgentSelection} from './use_agent_selection';

import type {SelectableAgent} from '@agents/types';
import type AiBotModel from '@agents/types/database/models/ai_bot';

/**
 * Agent selection for an agent entry point: resolves the saved agent (saved
 * pref -> default -> first), refreshes the bot list on open, and persists an
 * explicit pick as the saved agent. With `channelId`, only agents the server
 * accepts in that channel are offered (anything else 403s).
 */
export function useSavedAgentSelection(bots: AiBotModel[], selectedAgentId: string, channelId?: string) {
    const serverUrl = useServerUrl();

    const agents = useMemo(() => (channelId ? filterAgentsForChannel(bots, channelId) : bots), [bots, channelId]);
    const autoResolvedAgent = useMemo(() => resolveSelectedAgent(agents, selectedAgentId), [agents, selectedAgentId]);

    // With exactly one agent it is used silently.
    const showPicker = agents.length > 1;
    const {selectedAgent, selectAgent} = useAgentSelection(agents, autoResolvedAgent);

    useEffect(() => {
        fetchAIBots(serverUrl);
    }, [serverUrl]);

    const pickAgent = useCallback(async (agent: SelectableAgent) => {
        selectAgent(agent);
        const {error} = await saveSelectedAgent(serverUrl, agent.id);
        if (error) {
            logError('[useSavedAgentSelection] Failed to persist agent selection', getFullErrorMessage(error));
        }
    }, [serverUrl, selectAgent]);

    return {agents, selectedAgent, showPicker, pickAgent};
}
