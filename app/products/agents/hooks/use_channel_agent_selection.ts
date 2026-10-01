// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useMemo} from 'react';

import {fetchAIBots} from '@agents/actions/remote/bots';
import {saveSelectedAgent} from '@agents/actions/remote/preference';
import {filterAgentsForChannel, resolveAgentSelection} from '@agents/utils';
import {useServerUrl} from '@context/server';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {useAgentSelection} from './use_agent_selection';

import type {SelectableAgent} from '@agents/types';
import type AiBotModel from '@agents/types/database/models/ai_bot';

/**
 * Agent selection for a channel-scoped analysis sheet. Only agents the server
 * accepts for the channel are offered (anything else 403s), the bot list is
 * refreshed on open, and an explicit pick is persisted as the saved agent.
 */
export function useChannelAgentSelection(bots: AiBotModel[], channelId: string, selectedAgentId: string) {
    const serverUrl = useServerUrl();

    const channelBots = useMemo(() => filterAgentsForChannel(bots, channelId), [bots, channelId]);
    const {agent: autoResolvedAgent, showPicker} = useMemo(
        () => resolveAgentSelection(channelBots, selectedAgentId),
        [channelBots, selectedAgentId],
    );
    const {selectedAgent, selectAgent} = useAgentSelection(channelBots, autoResolvedAgent);

    useEffect(() => {
        fetchAIBots(serverUrl);
    }, [serverUrl]);

    const pickAgent = useCallback(async (agent: SelectableAgent) => {
        selectAgent(agent);
        const {error} = await saveSelectedAgent(serverUrl, agent.id);
        if (error) {
            logError('[useChannelAgentSelection] Failed to persist agent selection', getFullErrorMessage(error));
        }
    }, [serverUrl, selectAgent]);

    return {channelBots, selectedAgent, showPicker, pickAgent};
}
