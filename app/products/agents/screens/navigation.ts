// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AgentScreens from '@agents/constants/screens';
import {navigateToScreen} from '@screens/navigation';

export function goToAgentChat() {
    navigateToScreen(AgentScreens.AGENT_CHAT);
}

export function goToAgentThreadsList() {
    navigateToScreen(AgentScreens.AGENT_THREADS_LIST);
}
