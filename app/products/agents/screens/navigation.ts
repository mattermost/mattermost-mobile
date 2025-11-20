// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AgentScreens from '@agents/constants/screens';

import {goToScreen} from '@screens/navigation';

import type {IntlShape} from 'react-intl';

export function goToAgentChat(intl: IntlShape) {
    const title = intl.formatMessage({id: 'agents.chat.title', defaultMessage: 'Agents'});
    goToScreen(AgentScreens.AGENT_CHAT, title, {}, {});
}

export function goToAgentThreadsList(intl: IntlShape) {
    const title = intl.formatMessage({id: 'agents.threads_list.title', defaultMessage: 'Agent Conversations'});
    goToScreen(AgentScreens.AGENT_THREADS_LIST, title, {}, {});
}
